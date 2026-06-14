import type { ArtifactKind } from "@proxus/shared";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { ApiClient } from "../../api/client.ts";
import { apiRuntime } from "../../lib/runtime.ts";

export const artifactsQuery = apiRuntime
  .atom(
    ApiClient.use((client) =>
      client.artifacts.list({ query: {} })
    ).pipe(Effect.withSpan("artifacts.list", { kind: "client" }))
  )
  .pipe(Atom.keepAlive, Atom.withReactivity(["artifacts"]));

export const artifactsByKindQuery = Atom.family((kind: ArtifactKind) =>
  apiRuntime
    .atom(
      ApiClient.use((client) =>
        client.artifacts.list({ query: { kind } })
      ).pipe(Effect.withSpan("artifacts.listByKind", { kind: "client" }))
    )
    .pipe(Atom.keepAlive, Atom.withReactivity({ artifacts: [kind] }))
);
