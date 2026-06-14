import { Effect, Layer, Schema } from "effect";
import {
  LanguageModel,
  Model as AiModel,
  Tool,
  Toolkit
} from "effect/unstable/ai";
import { GeminiModel } from "./gemini.ts";

const Sum = Tool.make("sum", {
  description: "Add two numbers",
  parameters: Schema.Struct({
    a: Schema.Number,
    b: Schema.Number
  }),
  success: Schema.Number
});

const SumToolkit = Toolkit.make(Sum);

const SumToolkitLive = SumToolkit.toLayer({
  sum: ({ a, b }) => Effect.succeed(a + b)
});

export const sumAgent = Effect.gen(function* () {
  const provider = yield* AiModel.ProviderName;
  const modelName = yield* AiModel.ModelName;
  const toolkit = yield* SumToolkit;

  const response = yield* LanguageModel.generateText({
    prompt: "What is 2 + 3? Use the sum tool.",
    toolkit,
    toolChoice: { tool: "sum" } as const
  });

  const result = response.toolResults[0]?.result;

  console.log(`Provider: ${provider}`);
  console.log(`Model: ${modelName}`);
  console.log(`2 + 3 = ${result}`);

  return result;
}).pipe(
  Effect.provide(Layer.mergeAll(SumToolkitLive, GeminiModel))
);

if (import.meta.main) {
  Effect.runPromise(sumAgent);
}
