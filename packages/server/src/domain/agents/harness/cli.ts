import { Data, Effect } from "effect";

export class TokenizationError extends Data.TaggedError("TokenizationError")<{
  readonly message: string;
}> {}

export class HelpRequested extends Data.TaggedError("HelpRequested")<{
  readonly help: string;
}> {}

export class UnknownCommand extends Data.TaggedError("UnknownCommand")<{
  readonly command: string;
  readonly help: string;
}> {}

export class UnknownSubcommand extends Data.TaggedError("UnknownSubcommand")<{
  readonly command: string;
  readonly subcommand: string;
  readonly help: string;
}> {}

export class MissingArgument extends Data.TaggedError("MissingArgument")<{
  readonly argument: string;
}> {}

export class InvalidArgument extends Data.TaggedError("InvalidArgument")<{
  readonly argument: string;
  readonly value: string;
  readonly expected: string;
}> {}

export class UnexpectedArgument extends Data.TaggedError("UnexpectedArgument")<{
  readonly value: string;
}> {}

export type CliError =
  | TokenizationError
  | HelpRequested
  | UnknownCommand
  | UnknownSubcommand
  | MissingArgument
  | InvalidArgument
  | UnexpectedArgument;

type Pipeable<T> = T & { readonly pipe: <A>(f: (self: Pipeable<T>) => A) => A };

const withPipe = <T extends object>(value: T): Pipeable<T> => {
  const pipeable: Pipeable<T> = Object.assign(value, {
    pipe: <A>(f: (self: Pipeable<T>) => A): A => f(pipeable)
  });
  return pipeable;
};

interface ArgumentBase<T> {
  readonly name: string;
  readonly description: string;
  readonly metavar: string;
  readonly parse: (value: string | undefined) => Effect.Effect<T, CliError>;
}

export type Argument<T> = Pipeable<ArgumentBase<T>>;

type Params = Readonly<Record<string, Argument<unknown>>>;

type ParamsInput<P extends Params> = {
  readonly [K in keyof P]: P[K] extends Argument<infer T> ? T : never;
};

export interface Example {
  readonly command: string;
  readonly description: string;
}

interface CommandCommon {
  readonly name: string;
  readonly description: string;
  readonly examples: readonly Example[];
}

export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export interface GroupCommand<Subcommands extends NonEmptyReadonlyArray<Command> = NonEmptyReadonlyArray<Command>> extends CommandCommon {
  readonly kind: "group";
  readonly subcommands: Subcommands;
  readonly pipe: <A>(f: (self: GroupCommand<Subcommands>) => A) => A;
}

interface ExecCommandBase extends CommandCommon {
  readonly kind: "exec";
  readonly usage: readonly ParameterUsage[];
  readonly execute: (tokens: readonly string[]) => Effect.Effect<unknown, CliError>;
}

export interface ExecCommand extends ExecCommandBase {
  readonly pipe: <A>(f: (self: ExecCommand) => A) => A;
}

export interface ParameterUsage {
  readonly name: string;
  readonly description: string;
  readonly metavar: string;
}

export type Command = GroupCommand | ExecCommand;

const defaultDescription = "No description";

export const Argument = {
  string: (name: string): Argument<string> => withPipe({
    name,
    description: name,
    metavar: `<${name}>`,
    parse: (value) => value === undefined
      ? Effect.fail(new MissingArgument({ argument: name }))
      : Effect.succeed(value)
  }),
  optionalString: (name: string): Argument<string | undefined> => withPipe({
    name,
    description: name,
    metavar: `[${name}]`,
    parse: (value) => Effect.succeed(value)
  }),
  number: (name: string): Argument<number> => withPipe({
    name,
    description: name,
    metavar: `<${name}:number>`,
    parse: (value) => Effect.gen(function* () {
      if (value === undefined) {
        return yield* new MissingArgument({ argument: name });
      }

      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return yield* new InvalidArgument({ argument: name, value, expected: "number" });
      }

      return parsed;
    })
  }),
  choice: <const Choices extends readonly [string, ...Array<string>]>(
    name: string,
    choices: Choices
  ): Argument<Choices[number]> => withPipe({
    name,
    description: name,
    metavar: `<${name}:${choices.join("|")}>`,
    parse: (value) => Effect.gen(function* () {
      if (value === undefined) {
        return yield* new MissingArgument({ argument: name });
      }

      if (!choices.includes(value)) {
        return yield* new InvalidArgument({ argument: name, value, expected: choices.join(" | ") });
      }

      return value;
    })
  }),
  optionalChoice: <const Choices extends readonly [string, ...Array<string>]>(
    name: string,
    choices: Choices
  ): Argument<Choices[number] | undefined> => withPipe({
    name,
    description: name,
    metavar: `[${name}:${choices.join("|")}]`,
    parse: (value) => Effect.gen(function* () {
      if (value === undefined) {
        return undefined;
      }

      if (!choices.includes(value)) {
        return yield* new InvalidArgument({ argument: name, value, expected: choices.join(" | ") });
      }

      return value;
    })
  }),
  withDescription: (description: string) => <T>(argument: Argument<T>): Argument<T> =>
    withPipe({ ...argument, description }),
  withMetavar: (metavar: string) => <T>(argument: Argument<T>): Argument<T> =>
    withPipe({ ...argument, metavar })
};

export const Command = {
  group: <const Subcommands extends NonEmptyReadonlyArray<Command>>(
    name: string,
    subcommands: Subcommands
  ): GroupCommand<Subcommands> => withPipe({
    kind: "group" as const,
    name,
    description: defaultDescription,
    examples: [],
    subcommands
  }),
  exec: <const P extends Params>(
    name: string,
    parameters: P,
    run: (input: ParamsInput<P>) => Effect.Effect<unknown>
  ): ExecCommand => {
    const usage = parameterUsage(parameters);
    const command: ExecCommandBase = {
      kind: "exec" as const,
      name,
      description: defaultDescription,
      examples: [],
      usage,
      execute: (tokens) => Effect.gen(function* () {
        const input = yield* parseParameters(parameters, tokens);
        return yield* run(input);
      })
    };
    return withPipe(command);
  },
  withDescription: (description: string) => <C extends Command>(command: C): C =>
    withCommandMetadata(command, { description }),
  withExamples: (examples: readonly Example[]) => <C extends Command>(command: C): C =>
    withCommandMetadata(command, { examples })
};

const withCommandMetadata = <C extends Command>(
  command: C,
  metadata: Partial<Pick<CommandCommon, "description" | "examples">>
): C => {
  switch (command.kind) {
    case "group":
      return withPipe({ ...command, ...metadata });
    case "exec":
      return withPipe({ ...command, ...metadata });
  }
};

export const tokenize = (input: string): Effect.Effect<readonly string[], CliError> =>
  Effect.gen(function* () {
    const tokens: string[] = [];
    const tokenPattern = /\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s"']+))/gy;
    let index = 0;

    while (index < input.length) {
      tokenPattern.lastIndex = index;
      const match = tokenPattern.exec(input);

      if (match === null) {
        if (input.slice(index).trim().length === 0) {
          break;
        }
        return yield* new TokenizationError({ message: `Invalid token near: ${input.slice(index)}` });
      }

      const [, doubleQuoted, singleQuoted, bare] = match;
      tokens.push(unescapeToken(doubleQuoted ?? singleQuoted ?? bare ?? ""));
      index = tokenPattern.lastIndex;
    }

    return tokens;
  });

const unescapeToken = (token: string) => token.replace(/\\(["'\\])/g, "$1");

export const execute = (roots: readonly Command[], input: string): Effect.Effect<unknown, CliError> =>
  Effect.gen(function* () {
    const tokens = yield* tokenize(input);
    return yield* executeTokens(roots, tokens);
  });

export const executeTokens = (roots: readonly Command[], tokens: readonly string[]): Effect.Effect<unknown, CliError> =>
  Effect.gen(function* () {
    const [rootName, ...rest] = tokens;

    if (rootName === undefined || rootName === "help" || rootName === "--help") {
      return yield* new HelpRequested({ help: rootHelp(roots) });
    }

    const command = roots.find((root) => root.name === rootName);
    if (command === undefined) {
      return yield* new UnknownCommand({ command: rootName, help: rootHelp(roots) });
    }

    return yield* executeCommand(command, rest, command.name);
  });

const executeCommand = (command: Command, tokens: readonly string[], path: string): Effect.Effect<unknown, CliError> =>
  Effect.gen(function* () {
    if (tokens[0] === "help") {
      return yield* new HelpRequested({ help: commandHelp(command, path) });
    }

    switch (command.kind) {
      case "group": {
        const [subcommandName, ...rest] = tokens;
        if (subcommandName === undefined) {
          return yield* new HelpRequested({ help: commandHelp(command, path) });
        }

        const subcommand = command.subcommands.find((child) => child.name === subcommandName);
        if (subcommand === undefined) {
          return yield* new UnknownSubcommand({
            command: path,
            subcommand: subcommandName,
            help: commandHelp(command, path)
          });
        }

        return yield* executeCommand(subcommand, rest, `${path} ${subcommand.name}`);
      }
      case "exec":
        if (tokens.includes("--help")) {
          return yield* new HelpRequested({ help: commandHelp(command, path) });
        }
        return yield* command.execute(tokens);
    }
  });

const parseParameters = <P extends Params>(parameters: P, tokens: readonly string[]): Effect.Effect<ParamsInput<P>, CliError> =>
  Effect.gen(function* () {
    const keys = Object.keys(parameters) as Array<keyof P>;

    if (tokens.length > keys.length) {
      return yield* new UnexpectedArgument({ value: tokens[keys.length] ?? "<unknown>" });
    }

    const values: Partial<Record<keyof P, unknown>> = {};
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const argument = key === undefined ? undefined : parameters[key];
      if (key === undefined || argument === undefined) {
        return yield* new TokenizationError({ message: `Missing parameter definition at index ${index}` });
      }
      values[key] = yield* argument.parse(tokens[index]);
    }

    return values as ParamsInput<P>;
  });

const parameterUsage = (parameters: Params): readonly ParameterUsage[] =>
  Object.values(parameters).map((argument) => ({
    name: argument.name,
    description: argument.description,
    metavar: argument.metavar
  }));

export const renderError = (error: CliError) => {
  switch (error._tag) {
    case "TokenizationError":
      return error.message;
    case "HelpRequested":
      return error.help;
    case "UnknownCommand":
      return `Unknown command: ${error.command}\n\n${error.help}`;
    case "UnknownSubcommand":
      return `Unknown subcommand for ${error.command}: ${error.subcommand}\n\n${error.help}`;
    case "MissingArgument":
      return `Missing argument: ${error.argument}`;
    case "InvalidArgument":
      return `Invalid argument ${error.argument}: expected ${error.expected}, got ${error.value}`;
    case "UnexpectedArgument":
      return `Unexpected argument: ${error.value}\n\nIf the command contains JSON or spaces, wrap that whole argument in single quotes. Example: artifacts create '{"kind":"note","title":"Title","markdown":"Text"}'\n\nUse --help on the command for the exact syntax.`;
  }
};

const rootHelp = (roots: readonly Command[]) => `Available commands:\n${roots.map((command) => `- ${command.name}: ${command.description}`).join("\n")}`;

const commandHelp = (command: Command, path: string) => {
  switch (command.kind) {
    case "group":
      return groupHelp(command, path);
    case "exec":
      return execHelp(command, path);
  }
};

const groupHelp = (command: GroupCommand, path: string) => {
  const examples = command.examples.length === 0
    ? ""
    : `\n\nExamples:\n${command.examples.map((example) => `- ${example.command}: ${example.description}`).join("\n")}`;

  return `Usage:\n  ${path} <command>\n\n${command.description}\n\nSubcommands:\n${command.subcommands.map((child) => `- ${child.name}: ${child.description}`).join("\n")}${examples}`;
};

const execHelp = (command: ExecCommand, path: string) => {
  const usageArgs = command.usage.map((argument) => argument.metavar).join(" ");
  const args = command.usage.length === 0
    ? ""
    : `\n\nArguments:\n${command.usage.map((argument) => `${argument.metavar}: ${argument.description}`).join("\n")}`;
  const examples = command.examples.length === 0
    ? ""
    : `\n\nExamples:\n${command.examples.map((example) => `- ${example.command}: ${example.description}`).join("\n")}`;

  return `Usage:\n  ${path}${usageArgs.length === 0 ? "" : ` ${usageArgs}`}\n\n${command.description}${args}${examples}`;
};
