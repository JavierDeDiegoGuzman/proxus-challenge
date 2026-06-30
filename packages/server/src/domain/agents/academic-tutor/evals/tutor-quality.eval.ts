import { Console, Effect, Layer } from "effect";
import { GeminiModel } from "../../gemini.ts";
import { AgentSession } from "../../harness/index.ts";
import { makeAcademicTutorHarness } from "../../academic-tutor.ts";
import { ArtifactRepository } from "../../../artifacts/artifact.ts";
import { MaterialRepository } from "../../../materials/material.ts";
import { reviewShortAnswers } from "../short-answer-review.ts";
import {
  ArtifactRepositoryTestRef,
  EvalCaseReport,
  InMemoryArtifactRepository,
  formatReport,
  failed,
  makeMaterialRepository,
  passed,
  type ArtifactRepositoryState
} from "./eval-support.ts";

const DATASET_ID = "academic-tutor.tutor-quality";

const emptyState: ArtifactRepositoryState = {
  artifacts: [],
  attempts: [],
  nextArtifactId: 1,
  nextAttemptId: 1
};

const gradedQuizState: ArtifactRepositoryState = {
  artifacts: [
    {
      kind: "quiz",
      id: "artifact-cell-biology",
      title: "Cell Biology Quiz",
      questions: [
        {
          type: "true-false",
          id: "q1",
          prompt: "Mitochondria produce the cell's energy.",
          correctAnswer: true,
          explanation: "Mitochondria are the powerhouse of the cell."
        },
        {
          type: "true-false",
          id: "q2",
          prompt: "The nucleus is located outside the cell.",
          correctAnswer: false,
          explanation: "The nucleus is inside the cell."
        }
      ]
    }
  ],
  attempts: [
    {
      artifactKind: "quiz",
      status: "graded",
      id: "attempt-cell-biology-1",
      artifactId: "artifact-cell-biology",
      answers: [
        { questionType: "true-false", questionId: "q1", answer: true },
        { questionType: "true-false", questionId: "q2", answer: true }
      ],
      score: 1,
      maxScore: 2,
      summary: "1/2 correct",
      corrections: [
        {
          questionType: "true-false",
          questionId: "q1",
          correct: true,
          answer: true,
          correctAnswer: true,
          explanation: "Mitochondria are the powerhouse of the cell."
        },
        {
          questionType: "true-false",
          questionId: "q2",
          correct: false,
          answer: true,
          correctAnswer: false,
          explanation: "The nucleus is inside the cell."
        }
      ]
    }
  ],
  nextArtifactId: 2,
  nextAttemptId: 2
};

const makeAgentLayer = (state: ArtifactRepositoryState) => Layer.mergeAll(
  InMemoryArtifactRepository.pipe(Layer.provideMerge(ArtifactRepositoryTestRef.layerWithState(state))),
  Layer.succeed(MaterialRepository, makeMaterialRepository([])),
  GeminiModel
);

const runAgent = (input: string, state: ArtifactRepositoryState) => Effect.gen(function* () {
  const materialRepository = yield* MaterialRepository;
  const artifactRepository = yield* ArtifactRepository;
  const harness = makeAcademicTutorHarness(materialRepository, artifactRepository);
  const session = AgentSession.make(harness);
  return yield* session.run({ input, maxSteps: 8 }).pipe(Effect.provide(harness.layer));
}).pipe(Effect.provide(makeAgentLayer(state)));

/**
 * Baseline from docs/resources.md: the tutor should list materials when asked.
 * No fixtures needed beyond an empty repository — there is nothing to list.
 */
const listsMaterialsWhenAsked = () => Effect.gen(function* () {
  const result = yield* runAgent("List my uploaded materials.", emptyState);
  const output = result.output.toLocaleLowerCase();
  const usedMaterialsList = result.messages.some((message) =>
    message.role === "tool-call" && /materials\s+list/.test(JSON.stringify(message.input))
  );

  const criteria = [
    usedMaterialsList
      ? passed("calls-materials-list", "Agent called the materials list command.")
      : failed("calls-materials-list", "Agent never called materials list.", result.messages),
    output.length > 0
      ? passed("produces-answer", "Agent produced a final answer.")
      : failed("produces-answer", "Agent produced an empty answer.")
  ];

  return EvalCaseReport.make({
    evalId: DATASET_ID,
    caseId: "lists-materials-when-asked",
    status: criteria.every((criterion) => criterion.status === "passed") ? "passed" : "failed",
    output: result.output,
    criteria
  });
});

/**
 * Baseline from docs/resources.md: the agent should not invent information
 * when there are no relevant materials, instead of confidently fabricating
 * an answer.
 */
const doesNotFabricateWithoutMaterials = () => Effect.gen(function* () {
  const result = yield* runAgent(
    "What does my uploaded material say about quantum entanglement?",
    emptyState
  );
  const output = result.output.toLocaleLowerCase();
  const admitsNoMaterial = /no (uploaded |pdf )?material|haven.t uploaded|don.t have|no tienes? material|sin materiales|no materials|not found|please upload|upload.*first|first.*upload/.test(output);

  const criteria = [
    admitsNoMaterial
      ? passed("admits-missing-material", "Agent acknowledged it has no relevant material instead of fabricating an answer.")
      : failed("admits-missing-material", "Agent did not clearly say it has no relevant material.", { output: result.output })
  ];

  return EvalCaseReport.make({
    evalId: DATASET_ID,
    caseId: "does-not-fabricate-without-materials",
    status: criteria.every((criterion) => criterion.status === "passed") ? "passed" : "failed",
    output: result.output,
    criteria
  });
});

/**
 * Regression test for the Area 1 bug fix: the agent must be able to recall
 * the score of an attempt that was graded in a previous turn, instead of
 * claiming no results are saved. Reproduces the exact scenario described in
 * the challenge brief.
 */
const recallsGradedQuizResults = () => Effect.gen(function* () {
  const result = yield* runAgent(
    "What score did I get on the Cell Biology Quiz?",
    gradedQuizState
  );
  const output = result.output;
  const mentionsScore = /1\s*(\/|out of|de)\s*2/i.test(output);
  const usedAttemptDetail = result.messages.some((message) =>
    message.role === "tool-call" && /artifacts (attempt|grade)\b/.test(JSON.stringify(message.input))
  );
  const noFailures = !result.messages.some((message) => message.role === "tool-result" && message.isFailure);

  const criteria = [
    mentionsScore
      ? passed("mentions-correct-score", "Final answer mentions the real score (1/2).")
      : failed("mentions-correct-score", "Final answer did not mention the score 1/2.", { output }),
    usedAttemptDetail
      ? passed("uses-attempt-detail-command", "Agent used `artifacts attempt`/`artifacts grade` to read the graded attempt.")
      : failed("uses-attempt-detail-command", "Agent never called a command that returns full attempt detail.", result.messages),
    noFailures
      ? passed("no-tool-failures", "No tool calls failed while answering.")
      : failed("no-tool-failures", "At least one tool call failed.", result.messages)
  ];

  return EvalCaseReport.make({
    evalId: DATASET_ID,
    caseId: "recalls-graded-quiz-results",
    status: criteria.every((criterion) => criterion.status === "passed") ? "passed" : "failed",
    output,
    criteria
  });
});

/**
 * Direct test of the Pipeline 3 short-answer judge (no agent/harness
 * involved): a correct-but-differently-worded answer should be upgraded to
 * full score, and a genuinely wrong answer should stay wrong — the judge
 * must not be a rubber stamp.
 */
const shortAnswerJudgeAcceptsSynonymRejectsWrong = () => Effect.gen(function* () {
  const testArtifact = {
    kind: "test" as const,
    id: "artifact-organelles",
    title: "Cell Organelles Test",
    questions: [
      {
        type: "short-answer" as const,
        id: "q1",
        prompt: "What is the powerhouse of the cell?",
        expectedAnswer: "mitochondria",
        maxScore: 1
      }
    ]
  };

  const repository = ArtifactRepository.of({
    createArtifact: () => Effect.die("not used"),
    saveArtifact: () => Effect.die("not used"),
    getArtifact: () => Effect.succeed(testArtifact),
    listArtifacts: () => Effect.die("not used"),
    submitAttempt: () => Effect.die("not used"),
    saveAttempt: () => Effect.void,
    getAttempt: () => Effect.die("not used"),
    listAttempts: () => Effect.die("not used"),
    gradeAttempt: () => Effect.die("not used")
  });

  const makeAttempt = (id: string, answer: string) => ({
    artifactKind: "test" as const,
    status: "graded" as const,
    id,
    artifactId: testArtifact.id,
    answers: [{ questionType: "short-answer" as const, questionId: "q1", answer }],
    score: 0,
    maxScore: 1,
    summary: "0/1 points",
    corrections: [{
      questionType: "short-answer" as const,
      questionId: "q1",
      score: 0,
      maxScore: 1,
      feedback: "Expected: mitochondria"
    }]
  });

  const synonymResult = yield* reviewShortAnswers(repository, makeAttempt("attempt-synonym", "mitochondrion")).pipe(
    Effect.provide(GeminiModel)
  );
  const wrongResult = yield* reviewShortAnswers(repository, makeAttempt("attempt-wrong", "the nucleus")).pipe(
    Effect.provide(GeminiModel)
  );

  const criteria = [
    synonymResult.status === "graded" && synonymResult.score === 1
      ? passed("accepts-synonym", "Judge upgraded a correctly-worded-differently answer to full score.", synonymResult)
      : failed("accepts-synonym", "Judge did not upgrade a synonym answer to full score.", synonymResult),
    wrongResult.status === "graded" && wrongResult.score === 0
      ? passed("rejects-wrong-answer", "Judge correctly kept a wrong answer at zero score (not a rubber stamp).", wrongResult)
      : failed("rejects-wrong-answer", "Judge incorrectly upgraded a wrong answer.", wrongResult)
  ];

  return EvalCaseReport.make({
    evalId: DATASET_ID,
    caseId: "short-answer-judge-accepts-synonym-rejects-wrong",
    status: criteria.every((criterion) => criterion.status === "passed") ? "passed" : "failed",
    output: `synonym: ${synonymResult.status === "graded" ? synonymResult.score : "?"}/1, wrong: ${wrongResult.status === "graded" ? wrongResult.score : "?"}/1`,
    criteria
  });
});

export const runTutorQualityDataset = () => Effect.all(
  [
    listsMaterialsWhenAsked(),
    doesNotFabricateWithoutMaterials(),
    recallsGradedQuizResults(),
    shortAnswerJudgeAcceptsSynonymRejectsWrong()
  ],
  { concurrency: 1 }
);

export const tutorQualityEval = runTutorQualityDataset().pipe(
  Effect.tap((reports) => Console.log(formatReport(DATASET_ID, reports)))
);

if (import.meta.main) {
  Effect.runPromise(tutorQualityEval);
}
