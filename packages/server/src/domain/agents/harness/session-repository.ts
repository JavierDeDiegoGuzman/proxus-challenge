import { Context, Data, Effect } from "effect";
import type { AgentMessage } from "./message.ts";

export interface StoredAgentSession {
  readonly id: string;
  readonly messages: readonly AgentMessage[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MakeSessionInput {
  readonly id: string;
}

export interface AppendMessagesInput {
  readonly sessionId: string;
  readonly messages: readonly AgentMessage[];
}

export class SessionAlreadyExists extends Data.TaggedError("SessionAlreadyExists")<{
  readonly sessionId: string;
}> { }

export class SessionNotFound extends Data.TaggedError("SessionNotFound")<{
  readonly sessionId: string;
}> { }

export class SessionRepositoryStorageError extends Data.TaggedError("SessionRepositoryStorageError")<{
  readonly reason: unknown;
}> { }

export class SessionRepositorySerializationError extends Data.TaggedError("SessionRepositorySerializationError")<{
  readonly reason: unknown;
}> { }

export type SessionRepositoryError =
  | SessionAlreadyExists
  | SessionNotFound
  | SessionRepositoryStorageError
  | SessionRepositorySerializationError;

export interface SessionRepository {
  readonly getSession: (
    id: string
  ) => Effect.Effect<StoredAgentSession, SessionRepositoryError | SessionNotFound>;
  readonly makeSession: (
    input: MakeSessionInput
  ) => Effect.Effect<StoredAgentSession, SessionRepositoryError>;
  readonly appendMessages: (
    input: AppendMessagesInput
  ) => Effect.Effect<void, SessionRepositoryError>;
}

export const SessionRepository = Context.Service<SessionRepository>(
  "@proxus/server/agents/SessionRepository"
);
