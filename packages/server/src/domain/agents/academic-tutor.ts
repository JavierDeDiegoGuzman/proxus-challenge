import { Console, Effect, Layer, Stream } from "effect";
import { Model as AiModel } from "effect/unstable/ai";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { SessionRepository, AgentHarness, AgentSession } from "./harness/index.ts";
import { GeminiModel } from "./gemini.ts";
import { FileSessionRepository } from "../../infra/agents/file-session-repository.ts";
import { MaterialRepository } from "../materials/material.ts";
import { ArtifactRepository } from "../artifacts/artifact.ts";
import { FileMaterialRepository } from "../../infra/materials/file-material-repository.ts";
import { PopplerPdfService } from "../../infra/materials/poppler-pdf-service.ts";
import { FileArtifactRepository } from "../../infra/artifacts/file-artifact-repository.ts";
import { makeMaterialCommands } from "./academic-tutor/material-commands.ts";
import { makeArtifactCommands } from "./academic-tutor/artifact-commands.ts";
import { AcademicTutorSkills } from "./academic-tutor/skills/index.ts";

export const makeAcademicTutorHarness = (
  materialRepository: MaterialRepository,
  artifactRepository: ArtifactRepository
) => AgentHarness.make({
  name: `You are an academic tutor agent.

You help students understand academic material, especially their uploaded PDF materials.
Be precise, pedagogical, and honest about what you can infer from the available materials.`,
  skills: AcademicTutorSkills,
  commands: [
    makeMaterialCommands(materialRepository),
    makeArtifactCommands(artifactRepository)
  ]
});

export const academicTutorAgent = Effect.gen(function* () {
  const provider = yield* AiModel.ProviderName;
  const modelName = yield* AiModel.ModelName;
  const sessionRepository = yield* SessionRepository;
  const materialRepository = yield* MaterialRepository;
  const artifactRepository = yield* ArtifactRepository;
  const task = process.argv.slice(2).join(" ").trim() || "List my uploaded materials.";
  const sessionId = process.env.AGENT_SESSION_ID ?? "academic-tutor-demo";
  const storedSession = yield* sessionRepository.getSession(sessionId).pipe(
    Effect.catchTag("SessionNotFound", () => sessionRepository.makeSession({ id: sessionId }))
  );

  const harness = makeAcademicTutorHarness(materialRepository, artifactRepository);
  const session = AgentSession.make(harness);

  console.log(`Provider: ${provider}`);
  console.log(`Model: ${modelName}`);
  console.log(`Session: ${sessionId}`);
  console.log("Conversation messages:");

  const messages = yield* session.stream({
    input: task,
    messages: storedSession.messages,
    maxSteps: 8
  }).pipe(
    Stream.provide(harness.layer),
    Stream.tap((message) => Effect.gen(function* () {
      yield* sessionRepository.appendMessages({
        sessionId,
        messages: [message]
      });
      yield* Console.log(JSON.stringify(message, null, 2));
    })),
    Stream.runCollect
  );

  let output = "";
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message?.role === "assistant") {
      output = message.content;
      break;
    }
  }

  console.log(output);

  return output;
}).pipe(
  Effect.provide(Layer.mergeAll(
    GeminiModel,
    FileSessionRepository.layer(".data/agent-sessions").pipe(
      Layer.provide(NodeServices.layer)
    ),
    FileMaterialRepository.layer(".data/materials/pdfs").pipe(
      Layer.provide(PopplerPdfService.layer),
      Layer.provide(NodeServices.layer)
    ),
    FileArtifactRepository.layer(".data/artifacts").pipe(
      Layer.provide(NodeServices.layer)
    )
  ))
);

if (import.meta.main) {
  Effect.runPromise(academicTutorAgent);
}
