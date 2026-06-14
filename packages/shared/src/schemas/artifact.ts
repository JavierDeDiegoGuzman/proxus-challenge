import { Schema } from "effect";

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

export const ArtifactSummary = Schema.Struct({
  id: Schema.String,
  kind: Schema.Union([
    Schema.Literal("note"),
    Schema.Literal("quiz"),
    Schema.Literal("test")
  ]),
  title: Schema.String
});
export type ArtifactSummary = typeof ArtifactSummary.Type;

export const ArtifactListResponse = Schema.Struct({
  artifacts: Schema.Array(ArtifactSummary)
});
export type ArtifactListResponse = typeof ArtifactListResponse.Type;

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
