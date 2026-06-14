import { Config, Effect } from "effect";

export interface GoogleConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
}

export const defaultBaseUrl = "https://generativelanguage.googleapis.com/v1beta";

export const fromApiKey = (apiKey: string, baseUrl: string = defaultBaseUrl): GoogleConfig => ({
  apiKey,
  baseUrl
});

export const fromEnv = Effect.gen(function* () {
  const apiKey = yield* Config.string("GOOGLE_GENERATIVE_AI_API_KEY");
  return fromApiKey(apiKey);
});
