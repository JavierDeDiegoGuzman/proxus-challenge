# Plan

## Context

We have a reusable agent harness with static system prompts, manually loaded skills, a typed/effectful CLI tool, explicit message-based sessions, and append-only persistence. `math.ts` should become only a small example. The next target is an academic tutor agent operated via scripts/CLI first, before frontend/infra.

The tutor should:

- act as an academic teaching assistant / docente;
- access user-uploaded learning files;
- create practice exercises;
- review learner progress;
- expose capabilities through manually loaded skills and typed CLI commands;
- keep dynamic state in messages and repositories, not in mutable system prompts.

## Approach

Create a domain-centered academic tutor module around four domain areas:

1. Learning materials / uploaded files
2. Exercises and attempts
3. Learner progress
4. Tutor agent orchestration

Keep the generic harness untouched where possible. Add tutor-specific models, repositories, skills, and CLI commands. Use repositories as domain ports and file implementations later. For now, scripts can provide file-backed repositories and run the tutor agent from the terminal.

## Domain model design

### Shared value objects

- `StudentId`
- `CourseId`
- `MaterialId`
- `ExerciseId`
- `AttemptId`
- `SessionId`
- `Timestamp`
- `Difficulty`: `intro` | `easy` | `medium` | `hard` | `exam`
- `SubjectArea`: free string initially, later controlled taxonomy
- `LearningObjective`: `{ id, description, subject?, prerequisites? }`

### Learning materials

Represents files uploaded by the user and derived study content.

```ts
interface LearningMaterial {
  readonly id: MaterialId;
  readonly ownerId: StudentId;
  readonly title: string;
  readonly source: MaterialSource;
  readonly mimeType: string;
  readonly status: "uploaded" | "indexed" | "failed";
  readonly uploadedAt: string;
  readonly summary?: string;
  readonly objectives: readonly LearningObjective[];
}

type MaterialSource =
  | { readonly type: "file"; readonly path: string }
  | { readonly type: "text"; readonly content: string }
  | { readonly type: "url"; readonly url: string };

interface MaterialChunk {
  readonly id: string;
  readonly materialId: MaterialId;
  readonly index: number;
  readonly text: string;
  readonly page?: number;
  readonly headings: readonly string[];
}
```

Initial scope: plain text / markdown files. PDF/doc parsing can come later.

### Exercises

Represents generated practice tasks.

```ts
interface Exercise {
  readonly id: ExerciseId;
  readonly ownerId: StudentId;
  readonly materialIds: readonly MaterialId[];
  readonly objectiveIds: readonly string[];
  readonly type: ExerciseType;
  readonly prompt: string;
  readonly expectedAnswer?: string;
  readonly rubric: Rubric;
  readonly difficulty: Difficulty;
  readonly createdAt: string;
}

type ExerciseType =
  | "short-answer"
  | "multiple-choice"
  | "worked-problem"
  | "essay-outline"
  | "flashcard"
  | "oral-exam";

interface Rubric {
  readonly criteria: readonly RubricCriterion[];
}

interface RubricCriterion {
  readonly id: string;
  readonly description: string;
  readonly points: number;
}
```

### Attempts and feedback

Represents learner submissions and tutor review.

```ts
interface ExerciseAttempt {
  readonly id: AttemptId;
  readonly exerciseId: ExerciseId;
  readonly ownerId: StudentId;
  readonly answer: string;
  readonly submittedAt: string;
  readonly feedback?: ExerciseFeedback;
}

interface ExerciseFeedback {
  readonly score?: number;
  readonly maxScore?: number;
  readonly strengths: readonly string[];
  readonly gaps: readonly string[];
  readonly corrections: readonly string[];
  readonly nextSteps: readonly string[];
  readonly criterionScores: readonly CriterionScore[];
}

interface CriterionScore {
  readonly criterionId: string;
  readonly pointsAwarded: number;
  readonly comment: string;
}
```

### Learner progress

Represents durable learning state separate from chat history.

```ts
interface LearnerProfile {
  readonly id: StudentId;
  readonly displayName?: string;
  readonly goals: readonly string[];
  readonly preferences: TutorPreferences;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface TutorPreferences {
  readonly language: "es" | "en";
  readonly teachingStyle: "socratic" | "direct" | "mixed";
  readonly feedbackDepth: "brief" | "normal" | "deep";
}

interface ObjectiveProgress {
  readonly ownerId: StudentId;
  readonly objectiveId: string;
  readonly confidence: number; // 0..1
  readonly evidence: readonly ProgressEvidence[];
  readonly updatedAt: string;
}

interface ProgressEvidence {
  readonly type: "attempt" | "conversation" | "self-assessment";
  readonly referenceId: string;
  readonly summary: string;
  readonly delta: number;
  readonly at: string;
}
```

## Repository design

Keep repositories in domain as ports. Infra implementations can be file-backed first.

### `MaterialRepository`

- `getMaterial(id)` → fail `MaterialNotFound`
- `listMaterials(ownerId)`
- `saveMaterial(material)`
- `appendChunks(materialId, chunks)`
- `getChunks(materialId)`
- `searchMaterials(input)`

Search input initially can be simple text contains / keyword search. Later it can be vector retrieval.

```ts
interface MaterialSearchInput {
  readonly ownerId: StudentId;
  readonly query: string;
  readonly materialIds?: readonly MaterialId[];
  readonly limit?: number;
}
```

### `ExerciseRepository`

- `getExercise(id)` → fail `ExerciseNotFound`
- `listExercises(ownerId, filters?)`
- `saveExercise(exercise)`
- `saveAttempt(attempt)`
- `getAttempt(id)`
- `listAttempts(ownerId, filters?)`
- `attachFeedback(attemptId, feedback)`

### `ProgressRepository`

- `getProfile(studentId)`
- `saveProfile(profile)`
- `getObjectiveProgress(studentId, objectiveId)`
- `listObjectiveProgress(studentId)`
- `recordEvidence(input)`
- `summarizeProgress(studentId)`

### Existing `SessionRepository`

Reuse as-is for chat transcript persistence:

- user messages
- assistant messages
- tool calls
- tool results

Do not store educational progress in session JSON except as conversation messages. Durable progress belongs to `ProgressRepository`.

## CLI command design

Expose one public tool, `cli`, with a tutor command group. Commands should be typed/effectful and decoupled from skills.

### Materials

- `materials list`
- `materials inspect --id <materialId>`
- `materials search --query <text> [--limit <n>]`
- `materials objectives --id <materialId>`
- `materials summarize --id <materialId>`

Later:

- `materials import --path <path> --title <title>`
- `materials chunk --id <materialId>`

For the agent, uploads likely happen outside the LLM path; the agent reads/indexes/searches via commands.

### Exercises

- `exercises create --objective <objectiveId> --type <type> --difficulty <difficulty> [--material <materialId>]`
- `exercises list [--objective <objectiveId>] [--status <status>]`
- `exercises show --id <exerciseId>`
- `exercises submit --id <exerciseId> --answer <text>`
- `exercises review --attempt <attemptId>`

The `create` and `review` commands can initially return structured instructions/data for the model to turn into a nice pedagogical response, or they can create deterministic records and let the model generate content based on retrieved material.

### Progress

- `progress summary`
- `progress objectives`
- `progress objective --id <objectiveId>`
- `progress record --objective <objectiveId> --delta <number> --summary <text>`
- `progress recommendations`

### Tutor/session utility

- `tutor profile`
- `tutor set-goal --goal <text>`
- `tutor preferences --language <es|en> --style <socratic|direct|mixed>`

## Skill design

Skills remain manually authored docs/capabilities, not executable tools.

### `academic-tutor`

When to use: default teaching behavior.

Content:

- teach patiently;
- diagnose the student's current understanding;
- ask one question at a time when appropriate;
- do not dump full answers if the student asks for practice/help;
- explain with examples and analogies;
- cite material snippets when using uploaded files;
- use `materials search` before claiming uploaded-file facts.

### `socratic-teaching`

When to use: student asks for help solving or understanding.

Content:

- prefer guided questions;
- reveal hints progressively;
- identify misconception before giving solution;
- after student answers, give targeted feedback.

### `exercise-authoring`

When to use: creating practice exercises.

Content:

- align exercise to objective/material;
- include difficulty, expected answer, and rubric;
- vary exercise types;
- avoid testing trivia unless appropriate;
- use `exercises create` / `exercises show`.

### `feedback-and-grading`

When to use: reviewing submitted answers.

Content:

- grade against rubric;
- separate strengths, gaps, corrections, next steps;
- update progress only when evidence supports it;
- use `exercises review` and `progress record`.

### `study-planning`

When to use: planning study sessions.

Content:

- use progress summary and objectives;
- prioritize weak/high-value objectives;
- propose short actionable sessions;
- include retrieval practice and spaced repetition.

### `material-grounding`

When to use: answering from uploaded files.

Content:

- search materials first;
- quote or reference relevant chunks;
- distinguish material-grounded answer from general knowledge;
- say when uploaded materials do not contain enough evidence.

## Agent design

Create a new tutor agent script alongside `math.ts`, not inside it.

Suggested files:

- `packages/server/src/domain/academic/` for academic domain models/repositories
- `packages/server/src/domain/agents/academic-tutor.ts` for the agent example script
- `packages/server/src/domain/agents/academic-tutor/skills.ts`
- `packages/server/src/domain/agents/academic-tutor/commands.ts`

`math.ts` should remain a tiny smoke-test/example for the harness only.

The tutor harness should use:

```ts
AgentHarness.make({
  name: "Academic tutor",
  skills: [AcademicTutorSkill, SocraticTeachingSkill, MaterialGroundingSkill, ExerciseAuthoringSkill, FeedbackAndGradingSkill, StudyPlanningSkill],
  commands: [materialsCommands, exercisesCommands, progressCommands, tutorCommands]
})
```

System prompt should stay static and should only say:

- who the agent is;
- available skills by name/description;
- how to use `load_skill` and `cli`;
- safety/teaching boundaries.

The user task remains a user message.

## Files to modify

Planning only for now. Later likely files:

- `packages/server/src/domain/academic/material.ts`
- `packages/server/src/domain/academic/exercise.ts`
- `packages/server/src/domain/academic/progress.ts`
- `packages/server/src/domain/academic/repositories.ts`
- `packages/server/src/domain/agents/academic-tutor.ts`
- `packages/server/src/domain/agents/academic-tutor/skills.ts`
- `packages/server/src/domain/agents/academic-tutor/commands.ts`
- `packages/server/src/infra/academic/file-material-repository.ts`
- `packages/server/src/infra/academic/file-exercise-repository.ts`
- `packages/server/src/infra/academic/file-progress-repository.ts`
- `packages/server/package.json`

## Reuse

- `AgentHarness.make`
- `AgentSkill.make`
- `AgentCli.Command`
- `AgentCli.Argument`
- `AgentSession.make`
- existing `SessionRepository`
- existing `FileSessionRepository`
- existing `GeminiModel`

## Steps

- [ ] Keep `math.ts` minimal as harness example.
- [ ] Add academic domain models using Effect Schema where persistence/decoding is needed.
- [ ] Add repository interfaces in domain.
- [ ] Add initial file-backed infra repositories.
- [ ] Add tutor skills.
- [ ] Add typed CLI command groups for materials, exercises, progress, and tutor profile.
- [ ] Add `academic-tutor.ts` script accepting `pnpm --filter @proxus/server run agent:tutor "message"`.
- [ ] Add sample local data fixture for manual CLI testing.
- [ ] Verify with a multi-turn script flow: upload/index material, ask explanation, create exercise, submit answer, review progress.

## Verification

Manual first:

```sh
pnpm --filter @proxus/server run typecheck
pnpm --filter @proxus/server run agent:tutor "List my uploaded materials"
pnpm --filter @proxus/server run agent:tutor "Create a medium exercise about derivatives from my calculus notes"
pnpm --filter @proxus/server run agent:tutor "Review my last answer and tell me what to practice next"
```

Later tests:

- repository not-found failures;
- material search returns expected chunks;
- exercise creation persists records;
- attempt review attaches feedback;
- progress evidence updates summaries;
- tutor CLI help and argument parsing.
