import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { AgentMessage } from "../schemas/agent-message.ts";

export const TutorChatRequest = Schema.Struct({
  messages: Schema.Array(AgentMessage),
  input: Schema.String,
  maxSteps: Schema.optional(Schema.Number)
});
export type TutorChatRequest = typeof TutorChatRequest.Type;

export const TutorChatResponse = Schema.Struct({
  output: Schema.String,
  newMessages: Schema.Array(AgentMessage),
  messages: Schema.Array(AgentMessage)
});
export type TutorChatResponse = typeof TutorChatResponse.Type;

export class TutorApi extends HttpApiGroup.make("tutor")
  .add(HttpApiEndpoint.post("chat", "/chat", {
    payload: TutorChatRequest,
    success: TutorChatResponse
  }))
  .prefix("/tutor")
{}
