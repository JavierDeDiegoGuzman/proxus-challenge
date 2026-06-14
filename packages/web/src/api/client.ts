import { ProxusApi } from "@proxus/shared";
import { Context, flow, Layer } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest
} from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { apiClientConfig } from "./config.ts";

export class ApiClient extends Context.Service<
  ApiClient,
  HttpApiClient.ForApi<typeof ProxusApi>
>()("proxus-web/ApiClient") {
  static readonly layer = Layer.effect(
    ApiClient,
    HttpApiClient.make(ProxusApi, {
      transformClient: (client) =>
        client.pipe(
          HttpClient.mapRequest(
            flow(HttpClientRequest.prependUrl(apiClientConfig.apiUrl))
          )
        )
    })
  ).pipe(Layer.provide(FetchHttpClient.layer));
}
