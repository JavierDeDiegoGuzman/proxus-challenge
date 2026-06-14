import { Context, Data, Effect, Number as EffectNumber, Schema } from "effect";

export const QuestionOption = Schema.Struct({
  id: Schema.String,
  text: Schema.String
});
export type QuestionOption = typeof QuestionOption.Type;

export const MultipleChoiceQuestion = Schema.Struct({
  type: Schema.Literal("multiple-choice"),
  id: Schema.String,
  prompt: Schema.String,
  options: Schema.Array(QuestionOption),
  correctOptionId: Schema.String,
  explanation: Schema.String
});
export type MultipleChoiceQuestion = typeof MultipleChoiceQuestion.Type;

export const TrueFalseQuestion = Schema.Struct({
  type: Schema.Literal("true-false"),
  id: Schema.String,
  prompt: Schema.String,
  correctAnswer: Schema.Boolean,
  explanation: Schema.String
});
export type TrueFalseQuestion = typeof TrueFalseQuestion.Type;

export const ShortAnswerQuestion = Schema.Struct({
  type: Schema.Literal("short-answer"),
  id: Schema.String,
  prompt: Schema.String,
  expectedAnswer: Schema.String,
  maxScore: Schema.Number
});
export type ShortAnswerQuestion = typeof ShortAnswerQuestion.Type;

export const QuizQuestion = Schema.Union([
  MultipleChoiceQuestion,
  TrueFalseQuestion
]);
export type QuizQuestion = typeof QuizQuestion.Type;

export const TestQuestion = Schema.Union([
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  ShortAnswerQuestion
]);
export type TestQuestion = typeof TestQuestion.Type;

export const NoteArtifact = Schema.Struct({
  kind: Schema.Literal("note"),
  id: Schema.String,
  title: Schema.String,
  markdown: Schema.String
});
export type NoteArtifact = typeof NoteArtifact.Type;

export const QuizArtifact = Schema.Struct({
  kind: Schema.Literal("quiz"),
  id: Schema.String,
  title: Schema.String,
  questions: Schema.Array(QuizQuestion)
});
export type QuizArtifact = typeof QuizArtifact.Type;

export const TestArtifact = Schema.Struct({
  kind: Schema.Literal("test"),
  id: Schema.String,
  title: Schema.String,
  questions: Schema.Array(TestQuestion)
});
export type TestArtifact = typeof TestArtifact.Type;

export const Artifact = Schema.Union([
  NoteArtifact,
  QuizArtifact,
  TestArtifact
]);
export type Artifact = typeof Artifact.Type;
export type ArtifactKind = Artifact["kind"];

export const CreateNoteArtifactInput = Schema.Struct({
  kind: Schema.Literal("note"),
  title: Schema.String,
  markdown: Schema.String
});
export type CreateNoteArtifactInput = typeof CreateNoteArtifactInput.Type;

export const CreateQuizArtifactInput = Schema.Struct({
  kind: Schema.Literal("quiz"),
  title: Schema.String,
  questions: Schema.Array(QuizQuestion)
});
export type CreateQuizArtifactInput = typeof CreateQuizArtifactInput.Type;

export const CreateTestArtifactInput = Schema.Struct({
  kind: Schema.Literal("test"),
  title: Schema.String,
  questions: Schema.Array(TestQuestion)
});
export type CreateTestArtifactInput = typeof CreateTestArtifactInput.Type;

export const CreateArtifactInput = Schema.Union([
  CreateNoteArtifactInput,
  CreateQuizArtifactInput,
  CreateTestArtifactInput
]);
export type CreateArtifactInput = typeof CreateArtifactInput.Type;

export const MultipleChoiceAnswer = Schema.Struct({
  questionType: Schema.Literal("multiple-choice"),
  questionId: Schema.String,
  selectedOptionId: Schema.String
});
export type MultipleChoiceAnswer = typeof MultipleChoiceAnswer.Type;

export const TrueFalseAnswer = Schema.Struct({
  questionType: Schema.Literal("true-false"),
  questionId: Schema.String,
  answer: Schema.Boolean
});
export type TrueFalseAnswer = typeof TrueFalseAnswer.Type;

export const ShortAnswerAnswer = Schema.Struct({
  questionType: Schema.Literal("short-answer"),
  questionId: Schema.String,
  answer: Schema.String
});
export type ShortAnswerAnswer = typeof ShortAnswerAnswer.Type;

export const QuizAnswer = Schema.Union([
  MultipleChoiceAnswer,
  TrueFalseAnswer
]);
export type QuizAnswer = typeof QuizAnswer.Type;

export const TestAnswer = Schema.Union([
  MultipleChoiceAnswer,
  TrueFalseAnswer,
  ShortAnswerAnswer
]);
export type TestAnswer = typeof TestAnswer.Type;

export const MultipleChoiceCorrection = Schema.Struct({
  questionType: Schema.Literal("multiple-choice"),
  questionId: Schema.String,
  correct: Schema.Boolean,
  selectedOptionId: Schema.String,
  correctOptionId: Schema.String,
  explanation: Schema.String
});
export type MultipleChoiceCorrection = typeof MultipleChoiceCorrection.Type;

export const TrueFalseCorrection = Schema.Struct({
  questionType: Schema.Literal("true-false"),
  questionId: Schema.String,
  correct: Schema.Boolean,
  answer: Schema.Boolean,
  correctAnswer: Schema.Boolean,
  explanation: Schema.String
});
export type TrueFalseCorrection = typeof TrueFalseCorrection.Type;

export const ShortAnswerCorrection = Schema.Struct({
  questionType: Schema.Literal("short-answer"),
  questionId: Schema.String,
  score: Schema.Number,
  maxScore: Schema.Number,
  feedback: Schema.String
});
export type ShortAnswerCorrection = typeof ShortAnswerCorrection.Type;

export const AutoQuestionCorrection = Schema.Union([
  MultipleChoiceCorrection,
  TrueFalseCorrection
]);
export type AutoQuestionCorrection = typeof AutoQuestionCorrection.Type;

export const QuestionCorrection = Schema.Union([
  MultipleChoiceCorrection,
  TrueFalseCorrection,
  ShortAnswerCorrection
]);
export type QuestionCorrection = typeof QuestionCorrection.Type;

export const UngradedQuizAttempt = Schema.Struct({
  artifactKind: Schema.Literal("quiz"),
  status: Schema.Literal("ungraded"),
  id: Schema.String,
  artifactId: Schema.String,
  answers: Schema.Array(QuizAnswer)
});
export type UngradedQuizAttempt = typeof UngradedQuizAttempt.Type;

export const GradedQuizAttempt = Schema.Struct({
  artifactKind: Schema.Literal("quiz"),
  status: Schema.Literal("graded"),
  id: Schema.String,
  artifactId: Schema.String,
  answers: Schema.Array(QuizAnswer),
  score: Schema.Number,
  maxScore: Schema.Number,
  summary: Schema.String,
  corrections: Schema.Array(AutoQuestionCorrection)
});
export type GradedQuizAttempt = typeof GradedQuizAttempt.Type;

export const UngradedTestAttempt = Schema.Struct({
  artifactKind: Schema.Literal("test"),
  status: Schema.Literal("ungraded"),
  id: Schema.String,
  artifactId: Schema.String,
  answers: Schema.Array(TestAnswer)
});
export type UngradedTestAttempt = typeof UngradedTestAttempt.Type;

export const GradedTestAttempt = Schema.Struct({
  artifactKind: Schema.Literal("test"),
  status: Schema.Literal("graded"),
  id: Schema.String,
  artifactId: Schema.String,
  answers: Schema.Array(TestAnswer),
  score: Schema.Number,
  maxScore: Schema.Number,
  summary: Schema.String,
  corrections: Schema.Array(QuestionCorrection)
});
export type GradedTestAttempt = typeof GradedTestAttempt.Type;

export const ArtifactAttempt = Schema.Union([
  UngradedQuizAttempt,
  GradedQuizAttempt,
  UngradedTestAttempt,
  GradedTestAttempt
]);
export type ArtifactAttempt = typeof ArtifactAttempt.Type;

export const SubmitQuizAttemptInput = Schema.Struct({
  artifactKind: Schema.Literal("quiz"),
  artifactId: Schema.String,
  answers: Schema.Array(QuizAnswer)
});
export type SubmitQuizAttemptInput = typeof SubmitQuizAttemptInput.Type;

export const SubmitTestAttemptInput = Schema.Struct({
  artifactKind: Schema.Literal("test"),
  artifactId: Schema.String,
  answers: Schema.Array(TestAnswer)
});
export type SubmitTestAttemptInput = typeof SubmitTestAttemptInput.Type;

export const SubmitAttemptInput = Schema.Union([
  SubmitQuizAttemptInput,
  SubmitTestAttemptInput
]);
export type SubmitAttemptInput = typeof SubmitAttemptInput.Type;

export const ListArtifactsInput = Schema.Struct({
  kind: Schema.optional(Schema.Union([
    Schema.Literal("note"),
    Schema.Literal("quiz"),
    Schema.Literal("test")
  ]))
});
export type ListArtifactsInput = typeof ListArtifactsInput.Type;

export class ArtifactNotFound extends Data.TaggedError("ArtifactNotFound")<{
  readonly artifactId: string;
}> {}

export class AttemptNotFound extends Data.TaggedError("AttemptNotFound")<{
  readonly attemptId: string;
}> {}

export class ArtifactTypeMismatch extends Data.TaggedError("ArtifactTypeMismatch")<{
  readonly artifactId: string;
  readonly expected: "quiz" | "test";
  readonly actual: ArtifactKind;
}> {}

export class QuestionNotFound extends Data.TaggedError("QuestionNotFound")<{
  readonly questionId: string;
}> {}

export class AnswerTypeMismatch extends Data.TaggedError("AnswerTypeMismatch")<{
  readonly questionId: string;
  readonly expected: string;
  readonly actual: string;
}> {}

export class ArtifactRepositoryStorageError extends Data.TaggedError("ArtifactRepositoryStorageError")<{
  readonly reason: unknown;
}> {}

export class ArtifactRepositorySerializationError extends Data.TaggedError("ArtifactRepositorySerializationError")<{
  readonly reason: unknown;
}> {}

export type ArtifactRepositoryError =
  | ArtifactNotFound
  | AttemptNotFound
  | ArtifactTypeMismatch
  | QuestionNotFound
  | AnswerTypeMismatch
  | ArtifactRepositoryStorageError
  | ArtifactRepositorySerializationError;

export interface ArtifactRepository {
  readonly createArtifact: (input: CreateArtifactInput) => Effect.Effect<Artifact, ArtifactRepositoryError>;
  readonly saveArtifact: (artifact: Artifact) => Effect.Effect<void, ArtifactRepositoryError>;
  readonly getArtifact: (id: string) => Effect.Effect<Artifact, ArtifactRepositoryError>;
  readonly listArtifacts: (input?: ListArtifactsInput) => Effect.Effect<readonly Artifact[], ArtifactRepositoryError>;
  readonly submitAttempt: (input: SubmitAttemptInput) => Effect.Effect<ArtifactAttempt, ArtifactRepositoryError>;
  readonly saveAttempt: (attempt: ArtifactAttempt) => Effect.Effect<void, ArtifactRepositoryError>;
  readonly getAttempt: (id: string) => Effect.Effect<ArtifactAttempt, ArtifactRepositoryError>;
  readonly listAttempts: (artifactId?: string) => Effect.Effect<readonly ArtifactAttempt[], ArtifactRepositoryError>;
  readonly gradeAttempt: (attemptId: string) => Effect.Effect<ArtifactAttempt, ArtifactRepositoryError>;
}

export const ArtifactRepository = Context.Service<ArtifactRepository>(
  "@proxus/server/artifacts/ArtifactRepository"
);

export const makeArtifact = (input: CreateArtifactInput): Artifact => {
  const id = crypto.randomUUID();
  switch (input.kind) {
    case "note":
      return { ...input, id };
    case "quiz":
      return { ...input, id };
    case "test":
      return { ...input, id };
  }
};

export const makeUngradedAttempt = (input: SubmitAttemptInput): ArtifactAttempt => {
  const id = crypto.randomUUID();
  switch (input.artifactKind) {
    case "quiz":
      return { ...input, id, status: "ungraded" };
    case "test":
      return { ...input, id, status: "ungraded" };
  }
};

export const gradeAttempt = (
  artifact: Artifact,
  attempt: ArtifactAttempt
): Effect.Effect<ArtifactAttempt, ArtifactTypeMismatch | QuestionNotFound | AnswerTypeMismatch> => {
  if (attempt.status === "graded") {
    return Effect.succeed(attempt);
  }

  switch (attempt.artifactKind) {
    case "quiz":
      if (artifact.kind !== "quiz") {
        return Effect.fail(new ArtifactTypeMismatch({ artifactId: artifact.id, expected: "quiz", actual: artifact.kind }));
      }
      return gradeQuizAttempt(artifact, attempt);
    case "test":
      if (artifact.kind !== "test") {
        return Effect.fail(new ArtifactTypeMismatch({ artifactId: artifact.id, expected: "test", actual: artifact.kind }));
      }
      return gradeTestAttempt(artifact, attempt);
  }
};

const gradeQuizAttempt = (
  artifact: QuizArtifact,
  attempt: UngradedQuizAttempt
): Effect.Effect<GradedQuizAttempt, QuestionNotFound | AnswerTypeMismatch> => Effect.gen(function* () {
  const corrections: AutoQuestionCorrection[] = [];

  for (const answer of attempt.answers) {
    const question = yield* findQuestion(artifact.questions, answer.questionId);
    corrections.push(yield* correctAutoQuestion(question, answer));
  }

  const { score, maxScore } = scoreAutoCorrections(corrections);
  return {
    ...attempt,
    status: "graded" as const,
    score,
    maxScore,
    summary: `${score}/${maxScore} correct`,
    corrections
  };
});

const gradeTestAttempt = (
  artifact: TestArtifact,
  attempt: UngradedTestAttempt
): Effect.Effect<GradedTestAttempt, QuestionNotFound | AnswerTypeMismatch> => Effect.gen(function* () {
  const corrections: QuestionCorrection[] = [];

  for (const answer of attempt.answers) {
    const question = yield* findQuestion(artifact.questions, answer.questionId);
    corrections.push(yield* correctQuestion(question, answer));
  }

  const { score, maxScore } = scoreQuestionCorrections(corrections);
  return {
    ...attempt,
    status: "graded" as const,
    score,
    maxScore,
    summary: `${score}/${maxScore} points`,
    corrections
  };
});

const findQuestion = <Q extends QuizQuestion | TestQuestion>(
  questions: readonly Q[],
  questionId: string
): Effect.Effect<Q, QuestionNotFound> => {
  const question = questions.find((candidate) => candidate.id === questionId);
  return question === undefined
    ? Effect.fail(new QuestionNotFound({ questionId }))
    : Effect.succeed(question);
};

const correctAutoQuestion = (
  question: QuizQuestion,
  answer: QuizAnswer
): Effect.Effect<AutoQuestionCorrection, AnswerTypeMismatch> => {
  switch (question.type) {
    case "multiple-choice":
      if (answer.questionType !== "multiple-choice") {
        return Effect.fail(new AnswerTypeMismatch({ questionId: question.id, expected: question.type, actual: answer.questionType }));
      }
      return Effect.succeed({
        questionType: "multiple-choice" as const,
        questionId: question.id,
        correct: answer.selectedOptionId === question.correctOptionId,
        selectedOptionId: answer.selectedOptionId,
        correctOptionId: question.correctOptionId,
        explanation: question.explanation
      });
    case "true-false":
      if (answer.questionType !== "true-false") {
        return Effect.fail(new AnswerTypeMismatch({ questionId: question.id, expected: question.type, actual: answer.questionType }));
      }
      return Effect.succeed({
        questionType: "true-false" as const,
        questionId: question.id,
        correct: answer.answer === question.correctAnswer,
        answer: answer.answer,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      });
  }
};

const correctQuestion = (
  question: TestQuestion,
  answer: TestAnswer
): Effect.Effect<QuestionCorrection, AnswerTypeMismatch> => {
  if (question.type === "short-answer") {
    if (answer.questionType !== "short-answer") {
      return Effect.fail(new AnswerTypeMismatch({ questionId: question.id, expected: question.type, actual: answer.questionType }));
    }

    const correct = normalizeAnswer(answer.answer) === normalizeAnswer(question.expectedAnswer);
    return Effect.succeed({
      questionType: "short-answer" as const,
      questionId: question.id,
      score: correct ? question.maxScore : 0,
      maxScore: question.maxScore,
      feedback: correct
        ? "Answer matches the expected answer."
        : `Expected: ${question.expectedAnswer}`
    });
  }

  return correctAutoQuestion(question, answer as QuizAnswer);
};

const normalizeAnswer = (answer: string) => answer.trim().toLocaleLowerCase();

export const scoreAutoCorrections = (corrections: readonly AutoQuestionCorrection[]) => ({
  score: EffectNumber.sumAll(corrections.map((correction) => correction.correct ? 1 : 0)),
  maxScore: corrections.length
});

export const scoreQuestionCorrections = (corrections: readonly QuestionCorrection[]) => {
  const score = EffectNumber.sumAll(corrections.map((correction) => {
    switch (correction.questionType) {
      case "multiple-choice":
      case "true-false":
        return correction.correct ? 1 : 0;
      case "short-answer":
        return correction.score;
    }
  }));

  const maxScore = EffectNumber.sumAll(corrections.map((correction) => {
    switch (correction.questionType) {
      case "multiple-choice":
      case "true-false":
        return 1;
      case "short-answer":
        return correction.maxScore;
    }
  }));

  return {
    score: EffectNumber.clamp(score, { minimum: 0, maximum: maxScore }),
    maxScore
  };
};
