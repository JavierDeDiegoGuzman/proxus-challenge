# Plan

## Context

We now have a solid academic tutor agent foundation:

- agent harness with skills, typed CLI tools, sessions, and evals;
- academic tutor script;
- material access for uploaded PDFs, including page rendering as images;
- artifact system for `note`, `quiz`, and `test` artifacts;
- artifact authoring evals.

The next phase is to reorganize the agent-related code into clearer domain/application/infra boundaries, then add a small HTTP API and a very simple SPA around it.

Target UX:

- Main screen is a chat with the academic tutor.
- User types messages and receives assistant responses.
- If the browser refreshes, the chat session is lost.
- No UI for selecting prior sessions.
- Sidebar contains:
  - a dropdown/list of uploaded files/materials;
  - a dropdown/list of all artifacts.

## Effect HTTP docs reviewed

Reviewed local Effect docs under:

- `/Users/javier/.local/share/reference-repos/effect-smol/ai-docs/src/51_http-server`
- `/Users/javier/.local/share/reference-repos/effect-smol/ai-docs/src/50_http-client`

Relevant pattern from the docs:

- Define schema-first APIs with `effect/unstable/httpapi`:
  - `HttpApi`
  - `HttpApiGroup`
  - `HttpApiEndpoint`
  - `HttpApiBuilder`
  - `HttpApiScalar`
  - `HttpApiClient`
- Keep API definitions separate from server implementation so schemas can be shared with frontend/client code.
- Implement handlers with `HttpApiBuilder.group(Api, "group", ...)`.
- Serve routes with `HttpRouter.serve(...)` or export a web handler with `HttpRouter.toWebHandler(...)`.
- Expose OpenAPI via `HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" })`.
- Serve docs via `HttpApiScalar.layer(Api, { path: "/docs" })`.
- Use `Schema.TaggedErrorClass` / schema-backed errors for typed API failures.

For this project, the API should be schema-first and backed by Effect services/layers, but the first SPA can still be very small.

## Recommended architecture

### 0. Shared contract layer

Anything the frontend must know should live in `packages/shared`, not in `packages/server`.

This includes:

- public API shape;
- request/response schemas;
- public DTO schemas;
- generated/typed client helpers if we use `HttpApiClient` later.

Suggested structure:

```txt
packages/shared/src/
  api/
    Api.ts
    tutor.ts
    materials.ts
    artifacts.ts
  schemas/
    agent-message.ts
    material-summary.ts
    artifact-summary.ts
```

Rules:

- `shared` must not import from `server`.
- `web` can import from `shared`.
- `server` can import from `shared` to implement the public API contract.
- Domain models can be richer than public DTOs; map domain models to shared DTOs at the transport boundary.
- Only put stable public shapes in `shared`; avoid leaking infra/domain implementation details.

Example dependency direction:

```txt
web  ------------> shared
server transport -> shared
server domain ----> optional shared DTOs only if truly public
server infra -----> domain ports
```

Prefer this stricter split:

```txt
server domain model -> transport mapper -> shared DTO/API response
```

That keeps the API contract stable even if domain internals change.

### 1. Domain layer

Pure domain models, repository ports, and domain services. No HTTP, no filesystem, no Node-specific code, no frontend concerns.

Suggested structure:

```txt
packages/server/src/domain/
  agents/
    harness/
    tutor/
      tutor-agent.ts
      tutor-skills.ts
      tutor-commands.ts
  artifacts/
    artifact.ts
    artifact-repository.ts
  materials/
    material.ts
    material-repository.ts
    pdf-service.ts
  sessions/
    conversation-session.ts        # optional later, if we want domain session naming
```

Notes:

- Keep generic harness under `domain/agents/harness`.
- Move academic tutor-specific code out of `domain/agents/academic-tutor.ts` into a folder/module.
- Keep artifact/material models as Effect Schema source of truth.
- Keep repositories as Context services / domain ports.

### 2. Application layer

Use cases that orchestrate the domain and the harness. This is the layer the API and CLI scripts call.

Suggested structure:

```txt
packages/server/src/application/tutor/
  tutor-chat-service.ts
  list-materials.ts
  list-artifacts.ts
  get-artifact.ts
```

Core service:

```ts
TutorChatService
  - sendMessage(input): Effect<TutorChatResponse, TutorChatError, ...>
```

Important session decision:

- Browser refresh loses session.
- Therefore the API does not need server-side selectable chat sessions initially.
- The client can create an ephemeral `sessionId` in memory on page load and pass it to `/chat`.
- If page refreshes, a new in-memory session starts.
- We can still reuse `SessionRepository` internally if useful, but for the SPA first pass a process-memory session store may be enough.

Better first implementation:

- API receives the current chat messages from the frontend and returns new messages.
- Frontend owns ephemeral chat history.
- No server chat persistence required for SPA v1.
- Persisted artifacts/materials remain durable.

This aligns with the rule that messages are the source of truth.

### 3. Transport/API layer

Schema-first Effect HTTP API, implemented by the server but defined in `packages/shared`.

Shared API contract:

```txt
packages/shared/src/api/
  Api.ts
  tutor.ts
  materials.ts
  artifacts.ts
```

Server HTTP implementation:

```txt
packages/server/src/transport/http/
  handlers.ts
  server.ts
```

Endpoints:

#### Tutor chat

```txt
POST /api/tutor/chat
```

Payload:

```ts
{
  messages: AgentMessage[];
  input: string;
}
```

Success:

```ts
{
  output: string;
  newMessages: AgentMessage[];
  messages: AgentMessage[];
}
```

No persisted session selection in UI. The frontend keeps `messages` in memory.

#### Materials sidebar

```txt
GET /api/materials
GET /api/materials/:id
```

Success list can be minimal:

```ts
{
  materials: Array<{
    id: string;
    name: string;
    pageCount?: number;
  }>;
}
```

#### Artifacts sidebar

```txt
GET /api/artifacts
GET /api/artifacts/:id
```

Success list:

```ts
{
  artifacts: Array<{
    id: string;
    type: "note" | "quiz" | "test";
    title: string;
  }>;
}
```

Later endpoints:

```txt
POST /api/artifacts/:id/attempts
POST /api/artifacts/attempts/:attemptId/grade
```

But for first SPA, artifact interaction can happen through chat/agent commands.

### 4. Infra layer

Concrete implementations only.

Suggested structure:

```txt
packages/server/src/infra/
  agents/
    file-session-repository.ts
  artifacts/
    file-artifact-repository.ts
  materials/
    file-material-repository.ts
    poppler-pdf-service.ts
  runtime/
    bun-services.ts              # composition only, if needed
```

Rules:

- Infra can depend on filesystem/process services.
- Prefer Effect platform services: `FileSystem`, `Path`, `ChildProcessSpawner`.
- Runtime composition can provide `NodeServices.layer`.
- Domain/application/API should not call Node process/filesystem APIs directly.

### 5. Web SPA

Keep it extremely small.

Suggested structure:

```txt
packages/web/src/
  index.html
  main.tsx
  api.ts
  App.tsx
  components/
    Chat.tsx
    Sidebar.tsx
    MaterialDropdown.tsx
    ArtifactDropdown.tsx
```

State:

- `messages`: React state only.
- `input`: React state.
- `materials`: fetched on load.
- `artifacts`: fetched on load and refreshed after each assistant response.

Refresh behavior:

- Since messages are only in React memory, refresh clears chat.
- No session picker.

Initial UI:

- left sidebar:
  - Materials dropdown;
  - Artifacts dropdown.
- main panel:
  - chat message list;
  - input box;
  - submit button.

## Proposed API schemas

Use Effect Schema in `packages/shared` for public API schemas. The server domain may have richer internal schemas; transport maps between domain and shared DTOs.

### Chat schemas

Define a public `AgentMessage` schema in `packages/shared`. The server harness can either use this schema directly or map its internal messages to/from it.

```ts
ChatRequest = Schema.Struct({
  messages: Schema.Array(AgentMessage),
  input: Schema.String
})

ChatResponse = Schema.Struct({
  output: Schema.String,
  newMessages: Schema.Array(AgentMessage),
  messages: Schema.Array(AgentMessage)
})
```

### Material list schema

```ts
MaterialSummary = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  pageCount: Schema.optional(Schema.Number)
})
```

### Artifact list schema

Reuse artifact schema or expose a narrower summary:

```ts
ArtifactSummary = Schema.Struct({
  id: Schema.String,
  type: Schema.Literal("note", "quiz", "test"),
  title: Schema.String
})
```

## Reorganization steps

### Step 1: Make `math.ts` obviously an example

- Keep `math.ts` small.
- Move serious tutor code out of `domain/agents/academic-tutor.ts` into a folder.
- Consider `domain/agents/examples/math.ts` later, but not necessary immediately.

### Step 2: Split tutor domain module

Move from flat files:

```txt
packages/server/src/domain/agents/academic-tutor.ts
packages/server/src/domain/agents/academic-tutor/*
```

To something like:

```txt
packages/server/src/domain/agents/tutor/
  index.ts
  harness.ts
  skills.ts
  commands.ts
  material-commands.ts
  artifact-commands.ts
  evals/
```

Keep eval imports updated.

### Step 3: Introduce application service

Create:

```txt
packages/server/src/application/tutor/tutor-chat-service.ts
```

Responsibilities:

- create `AgentSession` from tutor harness;
- accept `messages` + `input`;
- call `session.run` or `session.stream`;
- return `output`, `newMessages`, `messages`;
- no frontend or HTTP details.

### Step 4: Add shared HTTP API definitions

Create API schemas/groups in `packages/shared`:

```txt
packages/shared/src/api/Api.ts
packages/shared/src/api/tutor.ts
packages/shared/src/api/materials.ts
packages/shared/src/api/artifacts.ts
packages/shared/src/schemas/agent-message.ts
packages/shared/src/schemas/material-summary.ts
packages/shared/src/schemas/artifact-summary.ts
```

Use `HttpApi`, `HttpApiGroup`, `HttpApiEndpoint`, and `Schema` from shared.

### Step 5: Add HTTP handlers

Create:

```txt
packages/server/src/transport/http/handlers.ts
```

Implement:

- `POST /api/tutor/chat`
- `GET /api/materials`
- `GET /api/artifacts`

Expose:

- `/openapi.json`
- `/docs`

### Step 6: Add server entrypoint

Create/update:

```txt
packages/server/src/server.ts
```

Layer composition:

- API handlers
- Tutor app service
- Tutor harness
- Gemini model
- material/artifact repositories
- PDF service
- Node platform services at the edge

### Step 7: Add minimal SPA

Build simple React frontend around endpoints.

No auth, no session picker, no persistence of chat in localStorage.

### Step 8: Add eval/test protection

Keep existing artifact authoring eval.

Add deterministic tests for:

- API schemas compile and decode payloads;
- `TutorChatService` works with mocked repositories;
- sidebar endpoints list mocked materials/artifacts.

## Files likely to modify

```txt
packages/server/src/domain/agents/academic-tutor.ts
packages/server/src/domain/agents/academic-tutor/*
packages/server/src/domain/agents/harness/message.ts
packages/server/src/application/tutor/tutor-chat-service.ts
packages/shared/src/api/Api.ts
packages/shared/src/api/tutor.ts
packages/shared/src/api/materials.ts
packages/shared/src/api/artifacts.ts
packages/shared/src/schemas/agent-message.ts
packages/shared/src/schemas/material-summary.ts
packages/shared/src/schemas/artifact-summary.ts
packages/server/src/transport/http/handlers.ts
packages/server/src/server.ts
packages/server/package.json
packages/web/src/*
```

## Verification

Server:

```sh
pnpm --filter @proxus/server run typecheck
pnpm --filter @proxus/server run eval:tutor:artifact-authoring
pnpm --filter @proxus/server run dev
```

API:

```sh
curl http://localhost:3000/api/materials
curl http://localhost:3000/api/artifacts
curl -X POST http://localhost:3000/api/tutor/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[],"input":"Hola, explícame qué archivos tengo."}'
```

Web:

- open SPA;
- send a chat message;
- verify assistant responds;
- refresh page;
- verify chat is empty;
- verify materials/artifacts sidebars reload;
- create artifact via chat;
- verify artifacts dropdown refreshes.
