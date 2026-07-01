import { Effect, Schema } from "effect";
import * as AgentCli from "../harness/index.ts";
import {
  Artifact,
  ArtifactAttempt,
  ArtifactNotFound,
  ArtifactRepositoryStorageError,
  ArtifactRepositorySerializationError,
  ArtifactTypeMismatch,
  AttemptNotFound,
  CreateArtifactInput,
  QuestionNotFound,
  AnswerTypeMismatch,
  SubmitAttemptInput,
  type ArtifactRepository
} from "../../artifacts/artifact.ts";

const UnknownFromJson = Schema.fromJsonString(Schema.Unknown);
const SubmitAttemptInputFromJson = Schema.fromJsonString(SubmitAttemptInput);

const renderArtifact = (artifact: Artifact) => JSON.stringify(artifact, null, 2);
const renderAttempt = (attempt: ArtifactAttempt) => JSON.stringify(attempt, null, 2);

const renderArtifactError = (error: ArtifactNotFound | AttemptNotFound | ArtifactTypeMismatch | QuestionNotFound | AnswerTypeMismatch | ArtifactRepositoryStorageError | ArtifactRepositorySerializationError) => {
  switch (error._tag) {
    case "ArtifactNotFound":
      return `Artifact not found: ${error.artifactId}`;
    case "AttemptNotFound":
      return `Attempt not found: ${error.attemptId}`;
    case "ArtifactTypeMismatch":
      return `Artifact ${error.artifactId} has kind ${error.actual}; expected ${error.expected}`;
    case "QuestionNotFound":
      return `Question not found: ${error.questionId}`;
    case "AnswerTypeMismatch":
      return `Answer type mismatch for question ${error.questionId}: expected ${error.expected}, got ${error.actual}`;
    case "ArtifactRepositoryStorageError":
      return `Artifact repository storage error: ${String(error.reason)}`;
    case "ArtifactRepositorySerializationError":
      return renderSerializationError(error.reason);
  }
};

const renderSerializationError = (reason: unknown) => {
  const message = String(reason);
  const multipleChoiceHint = message.includes("options")
    ? "\n\nFor multiple-choice questions, options must be objects, not strings: [{\"id\":\"a\",\"text\":\"Option A\"}]. The correctOptionId must match one option id."
    : "";

  return `Invalid artifact/attempt JSON: ${message}${multipleChoiceHint}\n\nUse artifacts create --help or artifacts submit --help for examples.`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionId = (text: string) => text
  .trim()
  .toLocaleLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || "option";

const normalizeMultipleChoiceQuestion = (question: Record<string, unknown>) => {
  const options = Array.isArray(question.options)
    ? question.options.map((option) => typeof option === "string"
        ? { id: optionId(option), text: option }
        : option)
    : question.options;

  const correctOptionId = typeof question.correctOptionId === "string" && Array.isArray(options)
    ? options.find((option) => isRecord(option) && option.text === question.correctOptionId) !== undefined
      ? optionId(question.correctOptionId)
      : question.correctOptionId
    : question.correctOptionId;

  return {
    ...question,
    options,
    correctOptionId
  };
};

const normalizeQuestion = (question: unknown) =>
  isRecord(question) && question.type === "multiple-choice"
    ? normalizeMultipleChoiceQuestion(question)
    : question;

const normalizeCreateArtifactInput = (input: unknown) => {
  if (!isRecord(input) || !Array.isArray(input.questions)) {
    return input;
  }

  return {
    ...input,
    questions: input.questions.map(normalizeQuestion)
  };
};

const decodeCreateArtifactInput = (json: string) =>
  Schema.decodeUnknownEffect(UnknownFromJson)(json).pipe(
    Effect.map(normalizeCreateArtifactInput),
    Effect.flatMap(Schema.decodeUnknownEffect(CreateArtifactInput)),
    Effect.mapError((reason) => new ArtifactRepositorySerializationError({ reason }))
  );

const decodeSubmitAttemptInput = (json: string) =>
  Schema.decodeUnknownEffect(SubmitAttemptInputFromJson)(json).pipe(
    Effect.mapError((reason) => new ArtifactRepositorySerializationError({ reason }))
  );

export const makeArtifactCommands = (repository: ArtifactRepository) => {
  const list = AgentCli.Command.withExamples([
    { command: "artifacts list", description: "List all saved artifacts" },
    { command: "artifacts list quiz", description: "List quiz artifacts only" }
  ])(
    AgentCli.Command.withDescription("List saved artifacts")(
      AgentCli.Command.exec("list", {
        kind: AgentCli.Argument.optionalChoice("kind", ["note", "quiz", "test"] as const).pipe(
          AgentCli.Argument.withDescription("Optional artifact kind filter")
        )
      }, ({ kind }) =>
        repository.listArtifacts(kind === undefined ? {} : { kind }).pipe(
          Effect.map((artifacts) => artifacts.length === 0
            ? "No artifacts found."
            : artifacts.map((artifact) => `- ${artifact.id}: ${artifact.title} (${artifact.kind})`).join("\n")
          ),
          Effect.catch((error) => Effect.succeed(renderArtifactError(error)))
        )
      )
    )
  );

  const show = AgentCli.Command.withExamples([
    { command: "artifacts show abc123", description: "Show an artifact as JSON" }
  ])(
    AgentCli.Command.withDescription("Show a saved artifact")(
      AgentCli.Command.exec("show", {
        artifactId: AgentCli.Argument.string("artifactId")
      }, ({ artifactId }) =>
        repository.getArtifact(artifactId).pipe(
          Effect.map(renderArtifact),
          Effect.catch((error) => Effect.succeed(renderArtifactError(error)))
        )
      )
    )
  );

  const create = AgentCli.Command.withExamples([
    {
      command: `artifacts create '{"kind":"note","title":"Derivatives summary","markdown":"# Derivatives\\n..."}'`,
      description: "Create a note artifact"
    },
    {
      command: `artifacts create '{"kind":"quiz","title":"Basics quiz","questions":[{"type":"true-false","id":"q1","prompt":"2+2=4","correctAnswer":true,"explanation":"Basic arithmetic."}]}'`,
      description: "Create a quiz artifact"
    }
  ])(
    AgentCli.Command.withDescription("Create a note, quiz, or test artifact from JSON")(
      AgentCli.Command.exec("create", {
        json: AgentCli.Argument.string("json").pipe(
          AgentCli.Argument.withDescription("CreateArtifactInput JSON")
        )
      }, ({ json }) =>
        decodeCreateArtifactInput(json).pipe(
          Effect.andThen((input) => repository.createArtifact(input)),
          Effect.map(renderArtifact),
          Effect.catch((error) => Effect.succeed(renderArtifactError(error)))
        )
      )
    )
  );

  const submit = AgentCli.Command.withExamples([
    {
      command: `artifacts submit '{"artifactKind":"quiz","artifactId":"abc123","answers":[{"questionType":"true-false","questionId":"q1","answer":true}]}'`,
      description: "Submit answers for a quiz or test"
    }
  ])(
    AgentCli.Command.withDescription("Submit an ungraded attempt for a quiz or test")(
      AgentCli.Command.exec("submit", {
        json: AgentCli.Argument.string("json").pipe(
          AgentCli.Argument.withDescription("SubmitAttemptInput JSON")
        )
      }, ({ json }) =>
        decodeSubmitAttemptInput(json).pipe(
          Effect.andThen((input) => repository.submitAttempt(input)),
          Effect.map(renderAttempt),
          Effect.catch((error) => Effect.succeed(renderArtifactError(error)))
        )
      )
    )
  );

  const attempts = AgentCli.Command.withExamples([
    { command: "artifacts attempts", description: "List all attempts" },
    { command: "artifacts attempts abc123", description: "List attempts for one artifact" }
  ])(
    AgentCli.Command.withDescription("List artifact attempts")(
      AgentCli.Command.exec("attempts", {
        artifactId: AgentCli.Argument.optionalString("artifactId").pipe(
          AgentCli.Argument.withDescription("Optional artifact id filter")
        )
      }, ({ artifactId }) =>
        repository.listAttempts(artifactId).pipe(
          Effect.map((attempts) => attempts.length === 0
            ? "No attempts found."
            : attempts.map((attempt) => `- ${attempt.id}: ${attempt.artifactKind} ${attempt.status} for ${attempt.artifactId}`).join("\n")
          ),
          Effect.catch((error) => Effect.succeed(renderArtifactError(error)))
        )
      )
    )
  );

  const attempt = AgentCli.Command.withExamples([
    { command: "artifacts attempt attempt123", description: "Show full details of one attempt, including score and corrections when already graded" }
  ])(
    AgentCli.Command.withDescription("Show one attempt's full details. Use this to answer questions about quiz/test results, whether the attempt is ungraded or already graded")(
      AgentCli.Command.exec("attempt", {
        attemptId: AgentCli.Argument.string("attemptId")
      }, ({ attemptId }) =>
        repository.getAttempt(attemptId).pipe(
          Effect.map(renderAttempt),
          Effect.catch((error) => Effect.succeed(renderArtifactError(error)))
        )
      )
    )
  );

  const grade = AgentCli.Command.withExamples([
    { command: "artifacts grade attempt123", description: "Grade a quiz/test attempt and persist the graded attempt" }
  ])(
    AgentCli.Command.withDescription("Grade an ungraded quiz/test attempt")(
      AgentCli.Command.exec("grade", {
        attemptId: AgentCli.Argument.string("attemptId")
      }, ({ attemptId }) =>
        repository.gradeAttempt(attemptId).pipe(
          Effect.map(renderAttempt),
          Effect.catch((error) => Effect.succeed(renderArtifactError(error)))
        )
      )
    )
  );

  return AgentCli.Command.group("artifacts", [list, show, create, submit, attempts, attempt, grade] as const).pipe(
    AgentCli.Command.withDescription("Study artifacts: notes, quizzes, tests, and attempts")
  );
};
