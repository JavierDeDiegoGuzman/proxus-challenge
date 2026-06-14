import type { TutorChatRequest } from "@proxus/shared";
import { Effect } from "effect";
import { ApiClient } from "../../api/client.ts";
import { apiRuntime } from "../../lib/runtime.ts";

export const sendTutorMessageAction = apiRuntime.fn(
  (input: TutorChatRequest) =>
    ApiClient.use((client) =>
      client.tutor.chat({ payload: input })
    ).pipe(Effect.withSpan("tutor.chat", { kind: "client" })),
  { concurrent: false }
);
