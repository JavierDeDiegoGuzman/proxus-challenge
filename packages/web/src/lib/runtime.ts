import * as Atom from "effect/unstable/reactivity/Atom";
import { ApiClient } from "../api-client/client.ts";

export const apiRuntime = Atom.runtime<ApiClient, never>(ApiClient.layer);
