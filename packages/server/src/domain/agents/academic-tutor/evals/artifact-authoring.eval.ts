import { Console, Data, Effect, Layer, Ref, Schema } from "effect";
import { GeminiModel } from "../../gemini.ts";
import { AgentSession } from "../../harness/index.ts";
import { type AgentMessage } from "../../harness/message.ts";
import { makeAcademicTutorHarness } from "../../academic-tutor.ts";
import { ArtifactRepository } from "../../../artifacts/artifact.ts";
import { MaterialRepository } from "../../../materials/material.ts";
import {
  ArtifactRepositoryTestRef,
  EvalCaseId,
  EvalCaseReport,
  InMemoryArtifactRepository,
  MaterialFixture,
  formatReport,
  failed,
  makeMaterialRepository,
  passed
} from "./eval-support.ts";

const ArtifactKind = Schema.Union([
  Schema.Literal("note"),
  Schema.Literal("quiz"),
  Schema.Literal("test")
]);

const ArtifactAuthoringExpected = Schema.Struct({
  artifactKind: ArtifactKind,
  questionCount: Schema.optional(Schema.Number)
});
type ArtifactAuthoringExpected = typeof ArtifactAuthoringExpected.Type;

const ArtifactAuthoringEvalCase = Schema.Struct({
  id: EvalCaseId,
  input: Schema.String,
  expected: ArtifactAuthoringExpected,
  materials: Schema.optional(Schema.Array(MaterialFixture)),
  maxSteps: Schema.optional(Schema.Number)
});
type ArtifactAuthoringEvalCase = typeof ArtifactAuthoringEvalCase.Type;

const ArtifactAuthoringEvalDataset = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
  cases: Schema.Array(ArtifactAuthoringEvalCase)
});
type ArtifactAuthoringEvalDataset = typeof ArtifactAuthoringEvalDataset.Type;

type EvalCaseContext = {
  readonly dataset: ArtifactAuthoringEvalDataset;
  readonly case: ArtifactAuthoringEvalCase;
  readonly output: string;
  readonly messages: readonly AgentMessage[];
};

type AcceptanceCriterion = {
  readonly id: string;
  readonly evaluate: (context: EvalCaseContext) => Effect.Effect<ReturnType<typeof passed>, never, ArtifactRepositoryTestRef>;
};

const makeEvalLayer = (testCase: ArtifactAuthoringEvalCase) => Layer.mergeAll(
  InMemoryArtifactRepository.pipe(Layer.provideMerge(ArtifactRepositoryTestRef.layer)),
  Layer.succeed(MaterialRepository, makeMaterialRepository(testCase.materials ?? [])),
  GeminiModel
);

const shouldCreateExpectedArtifact = (): AcceptanceCriterion => ({
  id: "should-create-expected-artifact",
  evaluate: (context) => Effect.gen(function* () {
    const ref = yield* ArtifactRepositoryTestRef;
    const state = yield* Ref.get(ref);
    const artifact = state.artifacts.at(-1);
    const expected = context.case.expected;

    if (artifact === undefined) {
      return failed("should-create-expected-artifact", "Expected an artifact to be created.", { artifacts: state.artifacts });
    }

    if (artifact.kind !== expected.artifactKind) {
      return failed("should-create-expected-artifact", `Expected ${expected.artifactKind}, got ${artifact.kind}.`, artifact);
    }

    if (expected.questionCount !== undefined) {
      if (artifact.kind === "note") {
        return failed("should-create-expected-artifact", "Expected questionCount but created a note.", artifact);
      }

      if (artifact.questions.length !== expected.questionCount) {
        return failed(
          "should-create-expected-artifact",
          `Expected ${expected.questionCount} questions, got ${artifact.questions.length}.`,
          artifact
        );
      }
    }

    return passed("should-create-expected-artifact", `Created expected ${artifact.kind} artifact ${artifact.id}.`, artifact);
  })
});

const shouldMentionCreatedArtifact = (): AcceptanceCriterion => ({
  id: "should-mention-created-artifact",
  evaluate: (context) => Effect.gen(function* () {
    const ref = yield* ArtifactRepositoryTestRef;
    const state = yield* Ref.get(ref);
    const artifact = state.artifacts.at(-1);

    if (artifact === undefined) {
      return failed("should-mention-created-artifact", "No artifact was created, so the final answer cannot mention it.");
    }

    const output = context.output.toLocaleLowerCase();
    const mentionsId = output.includes(artifact.id.toLocaleLowerCase());
    const mentionsCreation = /cread|created|he creado|i created|artifact|artefact/.test(output);

    return mentionsId || mentionsCreation
      ? passed("should-mention-created-artifact", "Final answer mentions the created artifact.")
      : failed("should-mention-created-artifact", "Final answer did not mention the created artifact.", { output: context.output, artifact });
  })
});

const shouldNotHaveToolFailures = (): AcceptanceCriterion => ({
  id: "should-not-have-tool-failures",
  evaluate: (context) => {
    const failures = context.messages.filter((message) => message.role === "tool-result" && message.isFailure);
    return Effect.succeed(failures.length === 0
      ? passed("should-not-have-tool-failures", "No tool failures were produced.")
      : failed("should-not-have-tool-failures", "Expected no tool failures.", failures)
    );
  }
});

const dataset = ArtifactAuthoringEvalDataset.make({
  id: "academic-tutor.artifact-authoring",
  description: "The tutor creates valid note, quiz, and test artifacts when the user asks for academic practice material.",
  cases: [
    {
      id: "creates-note",
      input: "Crea una nota breve sobre la regla de la potencia. Usa el comando artifacts create para persistirla. Mantén el markdown en una sola frase simple, sin fórmulas LaTeX, sin comillas y sin saltos de línea.",
      expected: { artifactKind: "note" },
      maxSteps: 8
    },
    {
      id: "creates-quiz",
      input: "Crea un quiz de 3 preguntas sobre derivadas. Usa preguntas true-false o multiple-choice y persiste el quiz con artifacts create.",
      expected: { artifactKind: "quiz", questionCount: 3 },
      maxSteps: 8
    },
    {
      id: "creates-test",
      input: "Crea un test de 2 preguntas sobre límites. Persiste el test con artifacts create.",
      expected: { artifactKind: "test", questionCount: 2 },
      maxSteps: 8
    }
  ]
});

const criteria = [
  shouldCreateExpectedArtifact(),
  shouldMentionCreatedArtifact(),
  shouldNotHaveToolFailures()
] as const;

const runEvalCase = (
  evalDataset: ArtifactAuthoringEvalDataset,
  testCase: ArtifactAuthoringEvalCase
) => Effect.gen(function* () {
  const materialRepository = yield* MaterialRepository;
  const artifactRepository = yield* ArtifactRepository;
  const harness = makeAcademicTutorHarness(materialRepository, artifactRepository);
  const session = AgentSession.make(harness);
  const result = yield* session.run({
    input: testCase.input,
    maxSteps: testCase.maxSteps ?? 8
  }).pipe(Effect.provide(harness.layer));

  const context: EvalCaseContext = {
    dataset: evalDataset,
    case: testCase,
    output: result.output,
    messages: result.messages
  };

  const criterionResults = yield* Effect.all(
    criteria.map((criterion) => criterion.evaluate(context)),
    { concurrency: 1 }
  );
  const status = criterionResults.every((criterion) => criterion.status === "passed") ? "passed" : "failed";

  return EvalCaseReport.make({
    evalId: evalDataset.id,
    caseId: testCase.id,
    status,
    output: result.output,
    criteria: criterionResults
  });
});

export const runArtifactAuthoringDataset = (evalDataset: ArtifactAuthoringEvalDataset = dataset) => Effect.gen(function* () {
  const reports: EvalCaseReport[] = [];

  for (const testCase of evalDataset.cases) {
    const report = yield* runEvalCase(evalDataset, testCase).pipe(
      Effect.provide(makeEvalLayer(testCase))
    );
    reports.push(report);
  }

  return reports;
});

class ArtifactAuthoringEvalFailed extends Data.TaggedError("ArtifactAuthoringEvalFailed")<{}> {}

export const artifactAuthoringEval = runArtifactAuthoringDataset().pipe(
  Effect.tap((reports) => Console.log(formatReport(dataset.id, reports))),
  Effect.andThen((reports) => reports.some((report) => report.status === "failed")
    ? Effect.fail(new ArtifactAuthoringEvalFailed())
    : Effect.succeed(reports)
  )
);

if (import.meta.main) {
  Effect.runPromise(artifactAuthoringEval);
}
