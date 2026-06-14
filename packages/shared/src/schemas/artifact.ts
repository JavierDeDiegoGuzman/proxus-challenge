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
