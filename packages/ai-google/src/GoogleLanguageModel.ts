import { Effect } from "effect";
import * as GoogleClient from "./GoogleClient.ts";
import type * as Generated from "./Generated.ts";

export interface ModelOptions {
  readonly model: string;
}

export const model = (modelName: string) => ({ model: modelName });

export const generateText = (
  options: ModelOptions & {
    readonly prompt: string;
    readonly generationConfig?: Generated.GenerationConfig;
  }
) =>
  Effect.gen(function* () {
    const client = yield* GoogleClient.GoogleClient;
    const request: Generated.GenerateContentRequest = {
      contents: [
        {
          role: "user",
          parts: [{ text: options.prompt }]
        }
      ],
      ...(options.generationConfig === undefined ? {} : { generationConfig: options.generationConfig })
    };

    const response = yield* client.generateContent(options.model, request);

    return response.candidates?.[0]?.content?.parts
      .map((part) => part.text ?? "")
      .join("") ?? "";
  });
