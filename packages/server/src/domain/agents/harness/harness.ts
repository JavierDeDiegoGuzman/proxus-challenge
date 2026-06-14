import { Effect, Layer, Schema } from "effect";
import { Tool, Toolkit } from "effect/unstable/ai";
import * as AgentCli from "./cli.ts";
import type { AgentSkill } from "./skill.ts";

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
  success: Schema.Unknown,
  failure: Schema.String,
  failureMode: "return"
});

export const AgentToolkit = Toolkit.make(LoadSkill, Cli);

export type AgentToolkit = typeof AgentToolkit;

export interface AgentHarness {
  readonly name: string;
  readonly toolkit: AgentToolkit;
  readonly layer: Layer.Layer<Tool.HandlersFor<AgentToolkit["tools"]>>;
  readonly systemPrompt: string;
  readonly skills: readonly AgentSkill[];
  readonly commands: readonly AgentCli.Command[];
  readonly loadSkill: (name: string) => Effect.Effect<string>;
}

export const AgentHarness = {
  make: (spec: {
    readonly name: string;
    readonly skills: readonly AgentSkill[];
    readonly commands?: readonly AgentCli.Command[];
  }): AgentHarness => {
    const commands = spec.commands ?? [];
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

    return {
      name: spec.name,
      toolkit: AgentToolkit,
      layer: AgentToolkit.toLayer({
        load_skill: ({ name }) => loadSkill(name),
        cli: ({ input }) => AgentCli.execute(commands, input).pipe(
          Effect.mapError(AgentCli.renderError)
        )
      }),
      systemPrompt,
      skills: spec.skills,
      commands,
      loadSkill
    };
  }
};

const skillsHelp = (skills: readonly AgentSkill[]) =>
  skills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n");

const unknownSkillHelp = (name: string, skills: readonly AgentSkill[]) =>
  `Unknown skill: ${name}\n\nAvailable skills:\n${skillsHelp(skills)}`;
