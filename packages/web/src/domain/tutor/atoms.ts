import type { AgentMessage, TutorChatRequest } from "@proxus/shared";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { ApiClient } from "../../api-client/client.ts";
import { apiRuntime } from "../../lib/runtime.ts";

export const sendTutorMessageAction = apiRuntime.fn(
  (input: TutorChatRequest) =>
    ApiClient.use((client) =>
      client.tutor.chat({ payload: input })
    ).pipe(Effect.withSpan("tutor.chat", { kind: "client" })),
  { concurrent: false }
);

/**
 * Shared chat history. The chat panel is the only place messages are shown,
 * so anything that wants to speak as the tutor (e.g. a proactive note after
 * an upload or a quiz submit) appends to this atom instead of rendering its
 * own message box.
 */
export const tutorMessagesAtom = Atom.make<readonly AgentMessage[]>([]).pipe(Atom.keepAlive);
