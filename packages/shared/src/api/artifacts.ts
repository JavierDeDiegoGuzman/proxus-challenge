import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { Artifact, ArtifactAttempt, ArtifactListResponse, SubmitAttemptInput } from "../schemas/artifact.ts";

const ArtifactKindQuery = Schema.Struct({
  kind: Schema.optional(Schema.Union([
    Schema.Literal("note"),
    Schema.Literal("quiz"),
    Schema.Literal("test")
  ]))
});

export const SubmitAttemptResponse = Schema.Struct({
  attempt: ArtifactAttempt,
  tutorNote: Schema.String
});
export type SubmitAttemptResponse = typeof SubmitAttemptResponse.Type;

export class ArtifactsApi extends HttpApiGroup.make("artifacts")
  .add(
    HttpApiEndpoint.get("list", "/", {
      query: ArtifactKindQuery,
      success: ArtifactListResponse
    }),
    HttpApiEndpoint.get("get", "/:id", {
      params: {
        id: Schema.String
      },
      success: Artifact
    }),
    HttpApiEndpoint.post("submit", "/:id/submit", {
      params: {
        id: Schema.String
      },
      payload: SubmitAttemptInput,
      success: SubmitAttemptResponse
    })
  )
  .prefix("/artifacts")
{}
