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
