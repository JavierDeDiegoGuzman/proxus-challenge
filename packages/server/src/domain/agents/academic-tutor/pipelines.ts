import { Effect } from "effect";
import { AgentSession } from "../harness/index.ts";
import { makeAcademicTutorHarness } from "../academic-tutor.ts";
import type { ArtifactRepository } from "../../artifacts/artifact.ts";
import type { MaterialRepository } from "../../materials/material.ts";

const PIPELINE_MAX_STEPS = 4;

const runPipeline = (
  materialRepository: MaterialRepository,
  artifactRepository: ArtifactRepository,
  input: string
) => {
  const harness = makeAcademicTutorHarness(materialRepository, artifactRepository);
  const session = AgentSession.make(harness);

  return session.run({ input, maxSteps: PIPELINE_MAX_STEPS }).pipe(
    Effect.provide(harness.layer),
    Effect.map((result) => result.output),
    Effect.catch((error) => Effect.succeed(`(El tutor no pudo generar una nota automática: ${String(error)})`))
  );
};

/**
 * Triggered right after a material is uploaded. Reuses the same harness/tools
 * as the chat, but with a fixed task instead of free user input.
 */
export const runMaterialUploadPipeline = (
  materialRepository: MaterialRepository,
  artifactRepository: ArtifactRepository,
  materialId: string
) => runPipeline(
  materialRepository,
  artifactRepository,
  `A new material with id "${materialId}" was just uploaded. Use "materials view" to inspect a few pages of it, ` +
  "then write a short, friendly note for the student: the topic, page count, and 2-3 key concepts you noticed. " +
  "End by asking if they want a study plan or a first quiz. Keep it under 80 words."
);

/**
 * Triggered right after a quiz/test attempt is graded. Reuses the same
 * harness/tools as the chat, but with a fixed task instead of free user input.
 */
export const runQuizReviewPipeline = (
  materialRepository: MaterialRepository,
  artifactRepository: ArtifactRepository,
  attemptId: string
) => runPipeline(
  materialRepository,
  artifactRepository,
  `The user just completed attempt "${attemptId}". Use "artifacts attempt ${attemptId}" to read the graded result, ` +
  "then write a short note for the student: their score, which topic(s) they got wrong, and one concrete suggestion " +
  "of what to review next. Keep it under 80 words."
);
