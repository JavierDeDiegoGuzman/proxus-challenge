import { Layer } from "effect";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import { HttpServerLive } from "./transport/http/server.ts";

Layer.launch(HttpServerLive).pipe(
  NodeRuntime.runMain
);
