import { Context, Data, Effect, Layer } from "effect";
import type * as Generated from "./Generated.ts";
import type { GoogleConfig } from "./GoogleConfig.ts";
import { defaultBaseUrl } from "./GoogleConfig.ts";

export class GoogleClientError extends Data.TaggedError("GoogleClientError")<{
  readonly cause: unknown;
  readonly message: string;
  readonly status?: number;
}> {}

export interface GoogleClient {
  readonly generateContent: (
    model: string,
    request: Generated.GenerateContentRequest
  ) => Effect.Effect<Generated.GenerateContentResponse, GoogleClientError>;
}

export const GoogleClient = Context.Service<GoogleClient>("@effect/ai-google/GoogleClient");

export const make = (config: GoogleConfig): GoogleClient => {
  const baseUrl = config.baseUrl ?? defaultBaseUrl;

  return {
    generateContent: (model, request) =>
      Effect.tryPromise({
        try: async (signal) => {
          const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify(request),
            signal
          });

          if (!response.ok) {
            throw new GoogleClientError({
              cause: await response.text(),
              message: `Google Generative AI request failed with status ${response.status}`,
              status: response.status
            });
          }

          return await response.json() as Generated.GenerateContentResponse;
        },
        catch: (cause) => cause instanceof GoogleClientError
          ? cause
          : new GoogleClientError({
            cause,
            message: "Google Generative AI request failed"
          })
      })
  };
};

export const layer = (config: GoogleConfig) => Layer.succeed(GoogleClient, make(config));
