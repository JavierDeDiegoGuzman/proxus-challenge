import { Effect, Layer, Schema, Stream } from "effect";
import { FileSystem } from "effect";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import { createServer } from "node:http";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiScalar } from "effect/unstable/httpapi";
import { LanguageModel } from "effect/unstable/ai";
import { ProxusApi, TutorChatRequest, TutorChatStreamEvent, type AgentMessage } from "@proxus/shared";
import { GeminiModel } from "../../domain/agents/gemini.ts";
import { TutorChatService, TutorChatServiceLive } from "../../domain/agents/academic-tutor/tutor-chat-service.ts";
import { FileArtifactRepository } from "../../infra/artifacts/file-artifact-repository.ts";
import { FileMaterialRepository } from "../../infra/materials/file-material-repository.ts";
import { PopplerPdfService } from "../../infra/materials/poppler-pdf-service.ts";
import { HttpHandlersLive } from "./handlers.ts";
import { qualityDashboardHtml } from "./quality-page.ts";

const LOGS_DIR = ".data/logs";
const SCORES_PATH = ".data/evals/scored.json";

const ApiRoutes = HttpApiBuilder.layer(ProxusApi, {
  openapiPath: "/openapi.json"
}).pipe(
  Layer.provide(HttpHandlersLive)
);

const DocsRoute = HttpApiScalar.layer(ProxusApi, {
  path: "/docs"
});

const encoder = new TextEncoder();

const encodeNdjson = (event: TutorChatStreamEvent) =>
  encoder.encode(`${JSON.stringify(Schema.encodeSync(TutorChatStreamEvent)(event))}\n`);

const TutorStreamRoute = HttpRouter.add("POST", "/api/tutor/chat/stream", () =>
  Effect.gen(function* () {
    const input = yield* HttpServerRequest.schemaBodyJson(TutorChatRequest);
    const tutor = yield* TutorChatService;
    const languageModel = yield* LanguageModel.LanguageModel;
    const fs = yield* FileSystem.FileSystem;

    const startedAt = Date.now();
    const collectedMessages: AgentMessage[] = [];

    const writeTrace = Effect.gen(function* () {
      const trace = {
        timestamp: new Date().toISOString(),
        input: input.input,
        durationMs: Date.now() - startedAt,
        messages: collectedMessages
      };
      const filename = `${trace.timestamp.replace(/[:.]/g, "-")}.json`;
      yield* fs.makeDirectory(LOGS_DIR, { recursive: true }).pipe(Effect.ignore);
      yield* fs.writeFileString(`${LOGS_DIR}/${filename}`, JSON.stringify(trace, null, 2)).pipe(Effect.ignore);
    });

    const body = tutor.streamMessage(input).pipe(
      Stream.provideService(LanguageModel.LanguageModel, languageModel),
      Stream.tap((event) => Effect.sync(() => {
        if (event.type === "message") {
          collectedMessages.push(event.message);
        }
      })),
      Stream.map(encodeNdjson),
      Stream.ensuring(writeTrace)
    );

    return HttpServerResponse.stream(body, {
      contentType: "application/x-ndjson",
      headers: {
        "cache-control": "no-cache",
        "x-accel-buffering": "no"
      }
    });
  })
);

const QualityPageRoute = HttpRouter.add("GET", "/quality", () =>
  Effect.succeed(HttpServerResponse.text(qualityDashboardHtml, { contentType: "text/html" }))
);

const QualityTracesRoute = HttpRouter.add("GET", "/quality/traces", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const entries = yield* fs.readDirectory(LOGS_DIR).pipe(
      Effect.orElseSucceed(() => [] as string[])
    );

    const jsonFiles = entries
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 50);

    const traces = yield* Effect.all(
      jsonFiles.map((file) =>
        fs.readFileString(`${LOGS_DIR}/${file}`).pipe(
          Effect.map((raw) => JSON.parse(raw)),
          Effect.orElseSucceed(() => null)
        )
      ),
      { concurrency: 5 }
    );

    return HttpServerResponse.text(
      JSON.stringify(traces.filter(Boolean)),
      { contentType: "application/json" }
    );
  })
);

const QualityScoresRoute = HttpRouter.add("GET", "/quality/scores", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const scored = yield* fs.readFileString(SCORES_PATH).pipe(
      Effect.orElseSucceed(() => "null")
    );
    const json = JSON.stringify({ scored: JSON.parse(scored) });
    return HttpServerResponse.text(json, { contentType: "application/json" });
  })
);

const JUDGE_PROMPT = (input: string, output: string) => `
You are evaluating an AI academic tutor. Score it on three dimensions based on this exchange.
Reply with ONLY a valid JSON object, no other text.

Student input: """${input}"""
Tutor response: """${output}"""

Score each from 1 to 5:
- accuracy: Is the information factually correct and not fabricated?
- helpfulness: Does the response address the student's actual need?
- groundedness: Is the response grounded in real content, not invented?

Reply with exactly: {"accuracy":<1-5>,"helpfulness":<1-5>,"groundedness":<1-5>,"reasoning":"<one sentence>"}
`.trim();

const RunJudgeRoute = HttpRouter.add("POST", "/quality/run-judge", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const lm = yield* LanguageModel.LanguageModel;

    const entries = yield* fs.readDirectory(LOGS_DIR).pipe(
      Effect.orElseSucceed(() => [] as string[])
    );

    const files = entries.filter((f) => f.endsWith(".json")).sort().reverse().slice(0, 10);

    const perTrace: Array<{ timestamp: string; input: string; scores: { accuracy: number; helpfulness: number; groundedness: number; reasoning: string } }> = [];

    for (const file of files) {
      const raw = yield* fs.readFileString(`${LOGS_DIR}/${file}`).pipe(Effect.orElseSucceed(() => "null"));
      const trace = JSON.parse(raw) as { timestamp: string; input: string; messages: Array<{ role: string; content?: string }> } | null;
      if (!trace) continue;

      const finalMsg = [...trace.messages].reverse().find((m) => m.role === "assistant");
      const output = finalMsg?.content ?? "";
      if (!output) continue;

      const response = yield* LanguageModel.generateText({
        prompt: JUDGE_PROMPT(trace.input, output)
      }).pipe(
        Effect.provideService(LanguageModel.LanguageModel, lm),
        Effect.orElseSucceed(() => ({ text: '{"accuracy":3,"helpfulness":3,"groundedness":3,"reasoning":"Judge unavailable."}' }))
      );

      const defaultScores = { accuracy: 3, helpfulness: 3, groundedness: 3, reasoning: "Parse error." };
      const scores: typeof defaultScores = yield* Effect.try({
        try: () => JSON.parse(response.text.replace(/```json|```/g, "").trim()) as typeof defaultScores,
        catch: () => defaultScores
      }).pipe(Effect.orElseSucceed(() => defaultScores));

      perTrace.push({ timestamp: trace.timestamp, input: trace.input.slice(0, 120), scores });
    }

    const avg = (key: "accuracy" | "helpfulness" | "groundedness") => {
      const vals = perTrace.filter((t) => t.scores[key] > 0);
      return vals.length === 0 ? 0 : Math.round(vals.reduce((s, t) => s + t.scores[key], 0) / vals.length * 10) / 10;
    };

    const report = {
      scoredAt: new Date().toISOString(),
      tracesEvaluated: perTrace.length,
      scores: { accuracy: avg("accuracy"), helpfulness: avg("helpfulness"), groundedness: avg("groundedness") },
      perTrace
    };

    yield* fs.makeDirectory(".data/evals", { recursive: true }).pipe(Effect.ignore);
    yield* fs.writeFileString(SCORES_PATH, JSON.stringify(report, null, 2)).pipe(Effect.ignore);

    return HttpServerResponse.text(JSON.stringify(report), { contentType: "application/json" });
  })
);

const Routes = Layer.mergeAll(
  ApiRoutes,
  DocsRoute,
  TutorStreamRoute,
  QualityPageRoute,
  QualityTracesRoute,
  QualityScoresRoute,
  RunJudgeRoute
);

const DomainLive = Layer.mergeAll(
  TutorChatServiceLive,
  GeminiModel
);

const InfraLive = Layer.mergeAll(
  FileMaterialRepository.layer(".data/materials/pdfs").pipe(
    Layer.provide(PopplerPdfService.layer)
  ),
  FileArtifactRepository.layer(".data/artifacts")
);

export const HttpServerLive = HttpRouter.serve(Routes).pipe(
  Layer.provide(DomainLive),
  Layer.provide(InfraLive),
  Layer.provide(NodeHttpServer.layer(
    () => createServer(),
    { port: Number(process.env.PORT ?? "3000") }
  ))
);
