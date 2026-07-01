import { Effect, Queue, Stream } from "effect";
import { LanguageModel, Prompt, Response, Tool } from "effect/unstable/ai";
import type { AgentHarness, AgentToolkit } from "./harness.ts";
import { isMaterialPageImages } from "../../materials/material.ts";
import { AgentMessage, type AgentMessage as AgentMessageType } from "./message.ts";

export interface AgentSessionRunOptions {
  readonly maxSteps?: number;
}

export interface AgentSessionRunInput extends AgentSessionRunOptions {
  readonly input: string;
  readonly messages?: readonly AgentMessageType[];
}

export interface AgentSessionRunResult {
  readonly output: string;
  readonly newMessages: readonly AgentMessageType[];
  readonly messages: readonly AgentMessageType[];
}

export interface AgentSession {
  readonly run: (
    input: AgentSessionRunInput
  ) => Effect.Effect<AgentSessionRunResult, unknown, LanguageModel.LanguageModel | Tool.HandlersFor<AgentToolkit["tools"]>>;
  readonly stream: (
    input: AgentSessionRunInput
  ) => Stream.Stream<AgentMessageType, unknown, LanguageModel.LanguageModel | Tool.HandlersFor<AgentToolkit["tools"]>>;
}

export const AgentSession = {
  make: (harness: AgentHarness): AgentSession => ({
    run: (input) => run(harness, input),
    stream: (input) => stream(harness, input)
  }),
  run,
  stream
};

function run(
  harness: AgentHarness,
  input: AgentSessionRunInput
): Effect.Effect<AgentSessionRunResult, unknown, LanguageModel.LanguageModel | Tool.HandlersFor<AgentToolkit["tools"]>> {
  return execute(harness, input, () => Effect.void);
}

function stream(
  harness: AgentHarness,
  input: AgentSessionRunInput
): Stream.Stream<AgentMessageType, unknown, LanguageModel.LanguageModel | Tool.HandlersFor<AgentToolkit["tools"]>> {
  return Stream.callback<AgentMessageType, unknown, LanguageModel.LanguageModel | Tool.HandlersFor<AgentToolkit["tools"]>>((queue) =>
    execute(harness, input, (message) => Queue.offer(queue, message).pipe(Effect.asVoid)).pipe(
      Effect.andThen(Queue.end(queue)),
      Effect.matchCauseEffect({
        onFailure: (cause) => Queue.failCause(queue, cause),
        onSuccess: () => Effect.void
      })
    )
  );
}

function execute(
  harness: AgentHarness,
  input: AgentSessionRunInput,
  emit: (message: AgentMessageType) => Effect.Effect<void>
): Effect.Effect<AgentSessionRunResult, unknown, LanguageModel.LanguageModel | Tool.HandlersFor<AgentToolkit["tools"]>> {
  return Effect.gen(function* () {
    const toolkit = yield* harness.toolkit;
    const previousMessages = input.messages ?? [];
    const newMessages: AgentMessageType[] = [];
    const allMessages = () => [...previousMessages, ...newMessages] as const;
    const appendMessage = (message: AgentMessageType): Effect.Effect<void> => Effect.gen(function* () {
      newMessages.push(message);
      yield* emit(message);
    });

    yield* appendMessage(AgentMessage.user(input.input));

    let lastToolResult = "";
    const maxSteps = input.maxSteps ?? 8;

    for (let step = 0; step < maxSteps; step++) {
      const prompt = renderPrompt(harness.systemPrompt, allMessages());
      const response: LanguageModel.GenerateTextResponse<AgentToolkit["tools"]> = yield* LanguageModel.generateText({
        prompt,
        toolkit,
        toolChoice: "auto" as const
      }).pipe(
        Effect.matchEffect({
          onFailure: (error) => Effect.succeed(modelErrorResponse(error)),
          onSuccess: (response) => Effect.succeed(response)
        })
      );

      for (const toolCall of response.toolCalls) {
        yield* appendMessage(AgentMessage.toolCall(toolCall.name, toolCall.params));
      }

      for (const toolResult of response.toolResults) {
        yield* appendMessage(AgentMessage.toolResult(toolResult.name, toolResult.result, toolResult.isFailure));
      }

      if (response.toolResults.length === 0) {
        const output = response.text.length > 0 ? response.text : lastToolResult;
        yield* appendMessage(AgentMessage.assistant(output));
        return {
          output,
          newMessages,
          messages: allMessages()
        };
      }

      lastToolResult = String(response.toolResults.at(-1)?.result ?? lastToolResult);
    }

    const output = lastToolResult.length > 0
      ? lastToolResult
      : "Agent stopped after reaching the maximum number of steps.";
    yield* appendMessage(AgentMessage.assistant(output));

    return {
      output,
      newMessages,
      messages: allMessages()
    };
  });
}

const modelErrorResponse = (error: unknown): LanguageModel.GenerateTextResponse<AgentToolkit["tools"]> =>
  new LanguageModel.GenerateTextResponse([
    Response.makePart("text", {
      text: `I hit an internal model/tool-routing error, so I stopped this turn safely instead of crashing the app.\n\n${formatAgentError(error)}`
    })
  ]);

const formatAgentError = (error: unknown) => {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return String(error);
};

const renderPrompt = (
  systemPrompt: string,
  messages: readonly AgentMessageType[]
): readonly Prompt.MessageEncoded[] => [
  {
    role: "system",
    content: systemPrompt
  },
  ...messages.map(renderMessage)
];

const renderMessage = (message: AgentMessageType): Prompt.MessageEncoded => {
  switch (message.role) {
    case "user":
      return {
        role: "user",
        content: message.content
      };
    case "assistant":
      return {
        role: "assistant",
        content: message.content
      };
    case "tool-call":
      return {
        role: "user",
        content: `[tool_call: ${message.name} ${JSON.stringify(message.input)}]`
      };
    case "tool-result":
      if (!message.isFailure && isMaterialPageImages(message.result)) {
        const result = message.result;
        return {
          role: "user",
          content: [
            {
              type: "text",
              text: `Tool result ${message.name}: rendered pages ${result.pages.map((page) => page.page).join(", ")} from ${result.material.title}.`
            },
            ...result.pages.map((page) => ({
              type: "file" as const,
              mediaType: page.mediaType,
              data: page.data,
              fileName: `${result.material.id}-page-${page.page}.png`
            }))
          ]
        };
      }

      return {
        role: "user",
        content: `Tool result ${message.name}${message.isFailure ? " failure" : ""}: ${formatToolResult(message.result)}`
      };
  }
};

const formatToolResult = (result: unknown) => {
  if (typeof result === "string") {
    return result;
  }

  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
};
