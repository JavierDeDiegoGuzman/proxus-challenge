import { Layer } from "effect";
import { BunRuntime } from "@effect/platform-bun";
import { HttpServerLive } from "./transport/http/server.ts";

Layer.launch(HttpServerLive).pipe(
  BunRuntime.runMain
);
