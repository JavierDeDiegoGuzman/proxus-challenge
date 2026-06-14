import { Effect, Layer, Schema } from "effect";
import { LanguageModel, Tool, Toolkit } from "effect/unstable/ai";
import * as AgentCli from "./agent-cli.ts";

const LoadSkill = Tool.make("load_skill", {
  description: "Load the full instructions for a listed skill by name.",
  parameters: Schema.Struct({
    name: Schema.String
  }),
  success: Schema.String
});

const Cli = Tool.make("cli", {
  description: "Run a CLI command. Use --help on commands to inspect usage, subcommands, and examples.",
  parameters: Schema.Struct({
    input: Schema.String
  }),
  success: Schema.String,
  failure: Schema.String,
  failureMode: "return"
});

const SkillToolkit = Toolkit.make(LoadSkill, Cli);

type SkillToolkit = typeof SkillToolkit;

export interface AgentSkill {
  readonly name: string;
  readonly description: string;
  readonly content: string;
}

export const AgentSkill = {
  make: (spec: {
    readonly name: string;
    readonly description: string;
    readonly content: string;
  }): AgentSkill => ({
    name: spec.name,
    description: spec.description,
    content: spec.content
  })
};

export interface AgentHarness {
  readonly toolkit: SkillToolkit;
  readonly layer: Layer.Layer<Tool.HandlersFor<SkillToolkit["tools"]>>;
  readonly systemPrompt: string;
  readonly loadSkill: (name: string) => Effect.Effect<string>;
  readonly run: (task: string, options?: { readonly maxSteps?: number }) => Effect.Effect<string, unknown, LanguageModel.LanguageModel | Tool.HandlersFor<SkillToolkit["tools"]>>;
}

export const AgentHarness = {
  make: (spec: {
    readonly name: string;
    readonly skills: ReadonlyArray<AgentSkill>;
    readonly commands?: ReadonlyArray<AgentCli.Command>;
  }): AgentHarness => {
    const findSkill = (name: string) => spec.skills.find((skill) => skill.name === name);

    const loadSkill = (name: string) =>
      Effect.succeed(
        findSkill(name)?.content ?? unknownSkillHelp(name, spec.skills)
      );

    const systemPrompt = `${spec.name}

You have access to a CLI tool. Use --help when you need command usage, subcommands, or examples.

Available skills:
${skillsHelp(spec.skills)}

You initially only know skill names and short descriptions.
When a task matches a skill description, call load_skill with that skill name before proceeding.
Skill text may describe workflows, conventions, examples, or tools available elsewhere in the harness.`;

    const run = (task: string, options?: { readonly maxSteps?: number }) => Effect.gen(function* () {
      const toolkit = yield* SkillToolkit;
      let context = "";
      let lastToolResult = "";
      let hasLoadedSkill = false;

      for (let step = 0; step < (options?.maxSteps ?? 8); step++) {
        const prompt = `${systemPrompt}${context}\n\nTask: ${task}`;
        const response: LanguageModel.GenerateTextResponse<SkillToolkit["tools"]> = hasLoadedSkill
          ? yield* LanguageModel.generateText({
              prompt,
              toolkit,
              toolChoice: { tool: "cli" } as const
            })
          : yield* LanguageModel.generateText({
              prompt,
              toolkit,
              toolChoice: { tool: "load_skill" } as const
            });

        const renderedResults = response.toolResults
          .map((result) => `${result.name}: ${String(result.result)}`)
          .join("\n");
        const renderedCalls = response.toolCalls
          .map((call) => `${call.name}: ${JSON.stringify(call.params)}`)
          .join("\n");

        if (response.toolResults.length === 0) {
          return response.text.length > 0 ? response.text : lastToolResult;
        }

        hasLoadedSkill = hasLoadedSkill || response.toolResults.some((result) => result.name === "load_skill");
        lastToolResult = String(response.toolResults.at(-1)?.result ?? lastToolResult);
        context += `\n\nCompleted tool calls:\n${renderedCalls}\nTool results:\n${renderedResults}\n\nContinue from these completed results. Do not repeat an already completed CLI command unless the previous result was an error.`;
      }

      return lastToolResult.length > 0
        ? lastToolResult
        : "Agent stopped after reaching the maximum number of steps.";
    });

    return {
      toolkit: SkillToolkit,
      layer: SkillToolkit.toLayer({
        load_skill: ({ name }) => loadSkill(name),
        cli: ({ input }) => AgentCli.execute(spec.commands ?? [], input).pipe(
          Effect.tap((result) => Effect.sync(() => console.log(`cli> ${input} => ${result}`))),
          Effect.mapError(AgentCli.renderError)
        )
      }),
      systemPrompt,
      loadSkill,
      run
    };
  }
};

const skillsHelp = (skills: ReadonlyArray<AgentSkill>) =>
  skills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n");

const unknownSkillHelp = (name: string, skills: ReadonlyArray<AgentSkill>) =>
  `Unknown skill: ${name}\n\nAvailable skills:\n${skillsHelp(skills)}`;
