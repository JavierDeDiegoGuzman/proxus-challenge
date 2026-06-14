import { Context, Effect, Layer } from "effect";
import { LanguageModel } from "effect/unstable/ai";
import type { TutorChatRequest, TutorChatResponse } from "@proxus/shared";
import { ArtifactRepository } from "../../artifacts/artifact.ts";
import { MaterialRepository } from "../../materials/material.ts";
import { AgentSession } from "../harness/index.ts";
import { makeAcademicTutorHarness } from "../academic-tutor.ts";

export interface TutorChatService {
  readonly sendMessage: (
    input: TutorChatRequest
  ) => Effect.Effect<TutorChatResponse, unknown, LanguageModel.LanguageModel>;
}

export const TutorChatService = Context.Service<TutorChatService>(
  "@proxus/server/agents/academic-tutor/TutorChatService"
);

export const TutorChatServiceLive = Layer.effect(
  TutorChatService,
  Effect.gen(function* () {
    const materialRepository = yield* MaterialRepository;
    const artifactRepository = yield* ArtifactRepository;
    const harness = makeAcademicTutorHarness(materialRepository, artifactRepository);
    const session = AgentSession.make(harness);

    return {
      sendMessage: (input) => session.run({
        input: input.input,
        messages: input.messages,
        maxSteps: input.maxSteps ?? 8
      }).pipe(
        Effect.provide(harness.layer)
      )
    };
  })
);
