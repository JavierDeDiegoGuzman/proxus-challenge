import { Context, Effect, Layer, Ref, Schema } from "effect";
import {
  Artifact,
  ArtifactAttempt,
  ArtifactNotFound,
  ArtifactRepository,
  ArtifactTypeMismatch,
  AttemptNotFound,
  type ArtifactRepositoryError,
  type CreateArtifactInput,
  type ListArtifactsInput,
  type SubmitAttemptInput,
  gradeAttempt
} from "../../../artifacts/artifact.ts";
import {
  MaterialNotFound,
  MaterialRepository,
  MaterialRepositoryError,
  type MaterialPageImages,
  type PdfMaterial
} from "../../../materials/material.ts";

export const EvalCaseId = Schema.String;

export const CriterionStatus = Schema.Union([
  Schema.Literal("passed"),
  Schema.Literal("failed")
]);

export const MaterialPageFixture = Schema.Struct({
  page: Schema.Number,
  text: Schema.String
});
export type MaterialPageFixture = typeof MaterialPageFixture.Type;

export const MaterialFixture = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  fileName: Schema.String,
  uploadedAt: Schema.String,
  pages: Schema.Array(MaterialPageFixture)
});
export type MaterialFixture = typeof MaterialFixture.Type;

export const CriterionResult = Schema.Struct({
  id: Schema.String,
  status: CriterionStatus,
  message: Schema.String,
  details: Schema.optional(Schema.Unknown)
});
export type CriterionResult = typeof CriterionResult.Type;

export const EvalCaseReport = Schema.Struct({
  evalId: Schema.String,
  caseId: Schema.String,
  status: CriterionStatus,
  output: Schema.String,
  criteria: Schema.Array(CriterionResult)
});
export type EvalCaseReport = typeof EvalCaseReport.Type;

export const passed = (id: string, message: string, details?: unknown): CriterionResult =>
  CriterionResult.make({ id, status: "passed", message, details });

export const failed = (id: string, message: string, details?: unknown): CriterionResult =>
  CriterionResult.make({ id, status: "failed", message, details });

export interface ArtifactRepositoryState {
  readonly artifacts: readonly Artifact[];
  readonly attempts: readonly ArtifactAttempt[];
  readonly nextArtifactId: number;
  readonly nextAttemptId: number;
}

export const emptyArtifactRepositoryState: ArtifactRepositoryState = {
  artifacts: [],
  attempts: [],
  nextArtifactId: 1,
  nextAttemptId: 1
};

export class ArtifactRepositoryTestRef extends Context.Service<ArtifactRepositoryTestRef, Ref.Ref<ArtifactRepositoryState>>()(
  "@proxus/server/evals/ArtifactRepositoryTestRef"
) {
  static readonly layer = Layer.effect(
    ArtifactRepositoryTestRef,
    Ref.make(emptyArtifactRepositoryState)
  );

  static readonly layerWithState = (state: ArtifactRepositoryState) => Layer.effect(
    ArtifactRepositoryTestRef,
    Ref.make(state)
  );
}

export const InMemoryArtifactRepository = Layer.effect(
  ArtifactRepository,
  Effect.gen(function* () {
    const ref = yield* ArtifactRepositoryTestRef;

    const createArtifact = (input: CreateArtifactInput): Effect.Effect<Artifact, ArtifactRepositoryError> =>
      Ref.modify(ref, (state) => {
        const artifact = {
          ...input,
          id: `artifact-${state.nextArtifactId}`
        } as Artifact;

        return [
          artifact,
          {
            ...state,
            artifacts: [...state.artifacts, artifact],
            nextArtifactId: state.nextArtifactId + 1
          }
        ];
      });

    const saveArtifact = (artifact: Artifact): Effect.Effect<void, ArtifactRepositoryError> =>
      Ref.update(ref, (state) => ({
        ...state,
        artifacts: [...state.artifacts.filter((candidate) => candidate.id !== artifact.id), artifact]
      }));

    const getArtifact = (id: string): Effect.Effect<Artifact, ArtifactRepositoryError> =>
      Ref.get(ref).pipe(
        Effect.andThen((state) => {
          const artifact = state.artifacts.find((candidate) => candidate.id === id);
          return artifact === undefined
            ? Effect.fail(new ArtifactNotFound({ artifactId: id }))
            : Effect.succeed(artifact);
        })
      );

    const listArtifacts = (input?: ListArtifactsInput): Effect.Effect<readonly Artifact[], ArtifactRepositoryError> =>
      Ref.get(ref).pipe(
        Effect.map((state) => input?.kind === undefined
          ? state.artifacts
          : state.artifacts.filter((artifact) => artifact.kind === input.kind)
        )
      );

    const submitAttempt = (input: SubmitAttemptInput): Effect.Effect<ArtifactAttempt, ArtifactRepositoryError> =>
      getArtifact(input.artifactId).pipe(
        Effect.andThen((artifact) => {
          if (artifact.kind !== input.artifactKind) {
            return Effect.fail(new ArtifactTypeMismatch({
              artifactId: artifact.id,
              expected: input.artifactKind,
              actual: artifact.kind
            }));
          }

          return Ref.modify(ref, (state) => {
            const attempt = {
              ...input,
              id: `attempt-${state.nextAttemptId}`,
              status: "ungraded" as const
            } as ArtifactAttempt;

            return [
              attempt,
              {
                ...state,
                attempts: [...state.attempts, attempt],
                nextAttemptId: state.nextAttemptId + 1
              }
            ];
          });
        })
      );

    const saveAttempt = (attempt: ArtifactAttempt): Effect.Effect<void, ArtifactRepositoryError> =>
      Ref.update(ref, (state) => ({
        ...state,
        attempts: [...state.attempts.filter((candidate) => candidate.id !== attempt.id), attempt]
      }));

    const getAttempt = (id: string): Effect.Effect<ArtifactAttempt, ArtifactRepositoryError> =>
      Ref.get(ref).pipe(
        Effect.andThen((state) => {
          const attempt = state.attempts.find((candidate) => candidate.id === id);
          return attempt === undefined
            ? Effect.fail(new AttemptNotFound({ attemptId: id }))
            : Effect.succeed(attempt);
        })
      );

    const listAttempts = (artifactId?: string): Effect.Effect<readonly ArtifactAttempt[], ArtifactRepositoryError> =>
      Ref.get(ref).pipe(
        Effect.map((state) => artifactId === undefined
          ? state.attempts
          : state.attempts.filter((attempt) => attempt.artifactId === artifactId)
        )
      );

    const gradeSavedAttempt = (attemptId: string): Effect.Effect<ArtifactAttempt, ArtifactRepositoryError> =>
      getAttempt(attemptId).pipe(
        Effect.andThen((attempt) => getArtifact(attempt.artifactId).pipe(
          Effect.andThen((artifact) => gradeAttempt(artifact, attempt)),
          Effect.andThen((gradedAttempt) => saveAttempt(gradedAttempt).pipe(Effect.as(gradedAttempt)))
        ))
      );

    return ArtifactRepository.of({
      createArtifact,
      saveArtifact,
      getArtifact,
      listArtifacts,
      submitAttempt,
      saveAttempt,
      getAttempt,
      listAttempts,
      gradeAttempt: gradeSavedAttempt
    });
  })
);

export const toPdfMaterial = (material: MaterialFixture): PdfMaterial => ({
  id: material.id,
  title: material.title,
  fileName: material.fileName,
  pageCount: material.pages.length,
  uploadedAt: material.uploadedAt
});

export const makeMaterialRepository = (materials: readonly MaterialFixture[]) => MaterialRepository.of({
  list: () => Effect.succeed(materials.map(toPdfMaterial)),
  get: (id) => {
    const material = materials.find((candidate) => candidate.id === id);
    return material === undefined
      ? Effect.fail(new MaterialNotFound({ materialId: id }))
      : Effect.succeed(toPdfMaterial(material));
  },
  renderPages: (id, pages) => {
    const material = materials.find((candidate) => candidate.id === id);
    if (material === undefined) {
      return Effect.fail(new MaterialNotFound({ materialId: id }));
    }

    const renderedPages = pages.map((page) => {
      const fixturePage = material.pages.find((candidate) => candidate.page === page);
      return {
        page,
        mediaType: "image/png" as const,
        data: `data:image/png;base64,${btoa(fixturePage?.text ?? `Page ${page}`)}`
      };
    });

    return Effect.succeed<MaterialPageImages>({
      type: "material-page-images",
      material: toPdfMaterial(material),
      pages: renderedPages
    });
  },
  upload: () => Effect.fail(new MaterialRepositoryError({ reason: "upload not supported in eval fixtures" }))
});

export const formatReport = (datasetId: string, reports: readonly EvalCaseReport[]) => {
  const lines: string[] = [datasetId];

  for (const report of reports) {
    lines.push(`  ${report.status === "passed" ? "✓" : "✗"} ${report.caseId}`);
    for (const criterion of report.criteria) {
      lines.push(`    ${criterion.status === "passed" ? "✓" : "✗"} ${criterion.id}: ${criterion.message}`);
      if (criterion.status === "failed" && criterion.details !== undefined) {
        lines.push(`      ${JSON.stringify(criterion.details, null, 2).split("\n").join("\n      ")}`);
      }
    }
  }

  return lines.join("\n");
};
