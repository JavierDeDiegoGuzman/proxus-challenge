import type { AgentMessage } from "@proxus/shared";

type ResourceKey = "artifacts" | "materials";

export interface InvalidationHandlers {
  readonly refreshArtifacts: () => void;
  readonly refreshMaterials: () => void;
}

export const invalidationsForToolCall = (message: AgentMessage): readonly ResourceKey[] => {
  if (message.role !== "tool-call" || message.name !== "cli") {
    return [];
  }

  const input = cliInput(message.input);
  if (input === undefined) {
    return [];
  }

  if (isArtifactMutation(input)) {
    return ["artifacts"];
  }

  if (isMaterialMutation(input)) {
    return ["materials"];
  }

  return [];
};

export const applyInvalidations = (
  keys: readonly ResourceKey[],
  handlers: InvalidationHandlers
) => {
  if (keys.includes("artifacts")) {
    handlers.refreshArtifacts();
  }

  if (keys.includes("materials")) {
    handlers.refreshMaterials();
  }
};

const cliInput = (input: unknown) => {
  if (typeof input !== "object" || input === null || !("input" in input)) {
    return undefined;
  }

  const command = input.input;
  return typeof command === "string" ? command.trim() : undefined;
};

const isArtifactMutation = (input: string) =>
  input.startsWith("artifacts create ") ||
  input.startsWith("artifacts submit ") ||
  input.startsWith("artifacts grade ");

const isMaterialMutation = (input: string) =>
  input.startsWith("materials import ") ||
  input.startsWith("materials delete ") ||
  input.startsWith("materials index ");
