import type { ArtifactKind, SubmitAttemptInput } from "@proxus/shared";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { ApiClient } from "../../api-client/client.ts";
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

export const artifactQuery = Atom.family((id: string) =>
  apiRuntime
    .atom(
      ApiClient.use((client) =>
        client.artifacts.get({ params: { id } })
      ).pipe(Effect.withSpan("artifacts.get", { kind: "client" }))
    )
    .pipe(Atom.keepAlive, Atom.withReactivity({ artifacts: [id] }))
);

export const selectedArtifactIdAtom = Atom.make<string | null>(null).pipe(Atom.keepAlive);

export const submitArtifactAttemptAction = apiRuntime.fn(
  (input: SubmitAttemptInput) =>
    ApiClient.use((client) => input.artifactKind === "quiz"
      ? client.artifacts.submit({
          params: { id: input.artifactId },
          payload: input
        })
      : client.artifacts.submit({
          params: { id: input.artifactId },
          payload: input
        })
    ).pipe(Effect.withSpan("artifacts.submit", { kind: "client" })),
  { reactivityKeys: ["artifacts"] }
);
