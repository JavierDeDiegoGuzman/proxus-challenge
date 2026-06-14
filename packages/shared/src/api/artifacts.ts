import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { Artifact, ArtifactListResponse } from "../schemas/artifact.ts";

const ArtifactKindQuery = Schema.Struct({
  kind: Schema.optional(Schema.Union([
    Schema.Literal("note"),
    Schema.Literal("quiz"),
    Schema.Literal("test")
  ]))
});

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
    })
  )
  .prefix("/artifacts")
{}
