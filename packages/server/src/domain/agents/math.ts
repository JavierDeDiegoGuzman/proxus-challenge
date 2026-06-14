import { Console, Effect, Layer, Stream } from "effect";
import { BunServices } from "@effect/platform-bun";
import { Model as AiModel } from "effect/unstable/ai";
import * as AgentCli from "./harness/index.ts";
import { AgentHarness, AgentSession, AgentSkill, SessionRepository } from "./harness/index.ts";
import { GeminiModel } from "./gemini.ts";
import { FileSessionRepository } from "../../infra/agents/file-session-repository.ts";

const MathArgs = {
  a: AgentCli.Argument.number("a").pipe(
    AgentCli.Argument.withDescription("First number")
  ),
  b: AgentCli.Argument.number("b").pipe(
    AgentCli.Argument.withDescription("Second number")
  )
} as const;

const add = AgentCli.Command.withExamples([
  { command: "math add 2 3", description: "Add 2 and 3" }
] as const)(
  AgentCli.Command.withDescription("Add two numbers")(
    AgentCli.Command.exec("add", MathArgs, ({ a, b }) =>
      Effect.succeed(String(a + b))
    )
  )
);

const subtract = AgentCli.Command.withExamples([
  { command: "math subtract 10 4", description: "Subtract 4 from 10" }
] as const)(
  AgentCli.Command.withDescription("Subtract b from a")(
    AgentCli.Command.exec("subtract", MathArgs, ({ a, b }) =>
      Effect.succeed(String(a - b))
    )
  )
);

const multiply = AgentCli.Command.withExamples([
  { command: "math multiply 6 7", description: "Multiply 6 by 7" }
] as const)(
  AgentCli.Command.withDescription("Multiply two numbers")(
    AgentCli.Command.exec("multiply", MathArgs, ({ a, b }) =>
      Effect.succeed(String(a * b))
    )
  )
);

const divide = AgentCli.Command.withExamples([
  { command: "math divide 10 2", description: "Divide 10 by 2" }
] as const)(
  AgentCli.Command.withDescription("Divide a by b")(
    AgentCli.Command.exec("divide", MathArgs, ({ a, b }) =>
      Effect.succeed(String(a / b))
    )
  )
);

const power = AgentCli.Command.withExamples([
  { command: "math power 2 8", description: "Raise 2 to the power of 8" }
] as const)(
  AgentCli.Command.withDescription("Raise a to the power of b")(
    AgentCli.Command.exec("power", MathArgs, ({ a, b }) =>
      Effect.succeed(String(a ** b))
    )
  )
);

const math = AgentCli.Command.group("math", [
  add,
  subtract,
  multiply,
  divide,
  power
] as const).pipe(
  AgentCli.Command.withDescription("Arithmetic commands")
);

const MathSkill = AgentSkill.make({
  name: "math",
  description: "Arithmetic workflows and CLI examples for add, subtract, multiply, divide, and power.",
  content: `# Math skill

Use this skill when the user asks you to calculate or transform numbers.

Use the public \`cli\` tool for arithmetic. Prefer the smallest command that directly matches the requested operation.

Commands:
- \`math add <a:number> <b:number>\`
- \`math subtract <a:number> <b:number>\`
- \`math multiply <a:number> <b:number>\`
- \`math divide <a:number> <b:number>\`
- \`math power <a:number> <b:number>\`

Examples:
- \`cli({ "input": "math multiply 6 7" })\`
- \`cli({ "input": "math divide 10 2" })\`
- \`cli({ "input": "math power 2 8" })\`

If you need exact command usage, call \`cli({ "input": "math --help" })\` or \`cli({ "input": "math multiply --help" })\`.
`
});

const MathHarness = AgentHarness.make({
  name: "You are a math agent.",
  skills: [MathSkill],
  commands: [math]
});

export const mathAgent2 = Effect.gen(function* () {
  const provider = yield* AiModel.ProviderName;
  const modelName = yield* AiModel.ModelName;
  const repository = yield* SessionRepository;
  const task = Bun.argv.slice(2).join(" ").trim() || "Calculate ((6 * 7) + (2 ^ 8)) / 10. Use the CLI step by step.";
  const sessionId = Bun.env.AGENT_SESSION_ID ?? "math-demo";
  const storedSession = yield* repository.getSession(sessionId).pipe(
    Effect.catchTag("SessionNotFound", () => repository.makeSession({ id: sessionId }))
  );

  const session = AgentSession.make(MathHarness);

  console.log(`Provider: ${provider}`);
  console.log(`Model: ${modelName}`);
  console.log(`Session: ${sessionId}`);
  console.log("Conversation messages:");

  const messages = yield* session.stream({
    input: task,
    messages: storedSession.messages,
    maxSteps: 5
  }).pipe(
    Stream.tap((message) => Effect.gen(function* () {
      yield* repository.appendMessages({
        sessionId,
        messages: [message]
      });
      yield* Console.log(JSON.stringify(message, null, 2));
    })),
    Stream.runCollect
  );

  let output = "";
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message?.role === "assistant") {
      output = message.content;
      break;
    }
  }

  console.log(`${task} = ${output}`);

  return output;
}).pipe(
  Effect.provide(Layer.mergeAll(
    MathHarness.layer,
    GeminiModel,
    FileSessionRepository.layer(".data/agent-sessions").pipe(
      Layer.provide(BunServices.layer)
    )
  ))
);

if (import.meta.main) {
  Effect.runPromise(mathAgent2);
}
