import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { ApiClient } from "../../api-client/client.ts";
import { apiRuntime } from "../../lib/runtime.ts";

export const materialsQuery = apiRuntime
  .atom(
    ApiClient.use((client) =>
      client.materials.list()
    ).pipe(Effect.withSpan("materials.list", { kind: "client" }))
  )
  .pipe(Atom.keepAlive, Atom.withReactivity(["materials"]));

export const uploadMaterialAction = apiRuntime.fn(
  (file: File) => {
    const formData = new FormData();
    formData.set("file", file);

    return ApiClient.use((client) =>
      client.materials.upload({ payload: formData })
    ).pipe(Effect.withSpan("materials.upload", { kind: "client" }));
  },
  { reactivityKeys: ["materials"] }
);
