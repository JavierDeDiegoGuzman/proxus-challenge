import { Console, Effect, Layer } from "effect";
import { FileSystem } from "effect";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { LanguageModel } from "effect/unstable/ai";
import { GeminiModel } from "../../gemini.ts";

const LOGS_DIR = ".data/logs";
const SCORES_PATH = ".data/evals/scored.json";

const JUDGE_PROMPT = (input: string, output: string) => `
You are evaluating an AI academic tutor. Given the student's input and the tutor's final response, score the tutor on three dimensions. Reply with ONLY a valid JSON object, no other text.

Student input: """${input}"""

Tutor response: """${output}"""

Score each dimension from 1 to 5:
- accuracy: Is the information factually correct and not fabricated? (5 = very accurate, 1 = clearly wrong/hallucinated)
- helpfulness: Does the response address the student's actual need? (5 = exactly what was needed, 1 = unhelpful or off-topic)
- groundedness: Is the response grounded in what the student provided / what was available? (5 = clearly references real content, 1 = completely made up)

Reply with exactly this JSON structure:
{"accuracy": <1-5>, "helpfulness": <1-5>, "groundedness": <1-5>, "reasoning": "<one short sentence>"}
`.trim();

const judgeTrace = (trace: { input: string; messages: Array<{ role: string; content?: string }> }) => {
  const finalMessage = [...trace.messages].reverse().find((m) => m.role === "assistant");
  const output = finalMessage?.content ?? "";

  if (output.length === 0) {
    return Effect.succeed({ accuracy: 0, helpfulness: 0, groundedness: 0, reasoning: "No assistant output found." });
  }

  return LanguageModel.generateText({
    prompt: JUDGE_PROMPT(trace.input, output)
  }).pipe(
    Effect.map((response) => {
      try {
        const cleaned = response.text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned);
      } catch {
        return { accuracy: 3, helpfulness: 3, groundedness: 3, reasoning: "Could not parse judge response." };
      }
    }),
    Effect.catch(() => Effect.succeed({ accuracy: 3, helpfulness: 3, groundedness: 3, reasoning: "Judge call failed, using neutral score." }))
  );
};

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  const nArg = process.argv.find((a) => a.startsWith("--n="));
  const n = nArg ? parseInt(nArg.replace("--n=", ""), 10) : 15;

  const entries = yield* fs.readDirectory(LOGS_DIR).pipe(
    Effect.orElseSucceed(() => [] as string[])
  );

  const files = entries.filter((f) => f.endsWith(".json")).sort().reverse().slice(0, n);

  if (files.length === 0) {
    yield* Console.log("No traces found in .data/logs/. Use the app first to generate some conversations.");
    return;
  }

  yield* Console.log(`Judging ${files.length} trace${files.length === 1 ? "" : "s"} with Gemini…\n`);

  const perTrace: Array<{
    timestamp: string;
    input: string;
    scores: { accuracy: number; helpfulness: number; groundedness: number; reasoning: string };
  }> = [];

  for (const file of files) {
    const raw = yield* fs.readFileString(`${LOGS_DIR}/${file}`).pipe(Effect.orElseSucceed(() => "null"));
    const trace = JSON.parse(raw);
    if (trace === null) {
      continue;
    }

    const scores = yield* judgeTrace(trace);
    perTrace.push({ timestamp: trace.timestamp, input: (trace.input as string).slice(0, 120), scores });

    const icon = (scores.accuracy + scores.helpfulness + scores.groundedness) / 3 >= 3.5 ? "✓" : "✗";
    yield* Console.log(`${icon} ${trace.timestamp} — acc:${scores.accuracy} help:${scores.helpfulness} gnd:${scores.groundedness} — ${scores.reasoning}`);
  }

  const avg = (key: "accuracy" | "helpfulness" | "groundedness") => {
    const valid = perTrace.filter((t) => t.scores[key] > 0);
    return valid.length === 0 ? 0 : Math.round(valid.reduce((s, t) => s + t.scores[key], 0) / valid.length * 10) / 10;
  };

  const report = {
    scoredAt: new Date().toISOString(),
    tracesEvaluated: perTrace.length,
    scores: {
      accuracy: avg("accuracy"),
      helpfulness: avg("helpfulness"),
      groundedness: avg("groundedness")
    },
    perTrace
  };

  yield* fs.makeDirectory(".data/evals", { recursive: true }).pipe(Effect.ignore);
  yield* fs.writeFileString(SCORES_PATH, JSON.stringify(report, null, 2));

  yield* Console.log(`\n─────────────────────────────────`);
  yield* Console.log(`Accuracy:     ${report.scores.accuracy}/5`);
  yield* Console.log(`Helpfulness:  ${report.scores.helpfulness}/5`);
  yield* Console.log(`Groundedness: ${report.scores.groundedness}/5`);
  yield* Console.log(`─────────────────────────────────`);
  yield* Console.log(`✓ Scores saved to ${SCORES_PATH}`);
}).pipe(
  Effect.provide(Layer.mergeAll(GeminiModel, NodeServices.layer))
);

if (import.meta.main) {
  Effect.runPromise(program).catch((error) => {
    console.error("Judge failed:", error);
    process.exit(1);
  });
}
