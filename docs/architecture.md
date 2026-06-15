# Arquitectura

## Vista general

```mermaid
flowchart LR
  subgraph Browser["Browser"]
    Web["React + Vite"]
    Atoms["@effect/atom-react"]
  end

  subgraph Server["Node + Effect Server"]
    direction LR

    subgraph Transport["Transport"]
      Http["HTTP API"]
      Stream["NDJSON Stream"]
      Handlers["HTTP Handlers"]
    end

    subgraph Domain["Domain"]
      Tutor["TutorChatService"]
      Harness["Agent Harness"]
      Materials["Materials Domain"]
      Artifacts["Artifacts Domain"]
    end

    subgraph Infra["Infrastructure adapters"]
      GeminiAdapter["Gemini adapter"]
      PopplerService["PopplerPdfService"]
      FileMaterials["FileMaterialRepository"]
      FileArtifacts["FileArtifactRepository"]
      FileSessions["FileSessionRepository"]
    end
  end

  subgraph External["External"]
    Gemini["Google Gemini"]
    Poppler["Poppler CLI"]
  end

  subgraph Storage["Local .data"]
    PDFs["materials/pdfs/*.pdf"]
    ArtifactJson["artifacts/*.json"]
    Attempts["attempts/*.json"]
    Sessions["agent-sessions/*.json"]
  end

  Web --> Atoms
  Atoms -->|"HTTP"| Http
  Web -->|"NDJSON"| Stream
  Http --> Handlers
  Stream --> Tutor
  Handlers --> Tutor
  Handlers --> Materials
  Handlers --> Artifacts
  Tutor --> Harness
  Harness --> Materials
  Harness --> Artifacts

  Harness --> GeminiAdapter
  Materials --> FileMaterials
  Materials --> PopplerService
  Artifacts --> FileArtifacts
  Harness --> FileSessions

  GeminiAdapter --> Gemini
  PopplerService --> Poppler
  FileMaterials --> PDFs
  FileArtifacts --> ArtifactJson
  FileArtifacts --> Attempts
  FileSessions --> Sessions
```

El repo está organizado como monorepo `pnpm`:

- `packages/shared`: contratos de API y schemas compartidos.
- `packages/server`: dominio, infraestructura y transporte HTTP.
- `packages/web`: UI React y estado cliente.
- `packages/ai-google`: integración local de Google AI para Effect.

## Dirección de dependencias

```mermaid
flowchart TD
  Web["packages/web"] --> Shared["packages/shared"]
  Server["packages/server"] --> Shared
  Server --> AiGoogle["packages/ai-google"]

  Shared -. "no depende de" .-> Web
  Shared -. "no depende de" .-> Server
```

`shared` no debería depender de `server` ni de `web`. Es la capa que evita que el contrato HTTP se duplique manualmente en ambos lados.

## Shared: contratos y schemas

Archivos principales:

- `packages/shared/src/api/Api.ts`
- `packages/shared/src/api/tutor.ts`
- `packages/shared/src/api/materials.ts`
- `packages/shared/src/api/artifacts.ts`
- `packages/shared/src/schemas/*`

Aquí se definen endpoints con Effect HTTP API y schemas con `Schema`. El server los implementa y la web los consume.

## Server: transporte, dominio e infraestructura

El backend intenta separar tres responsabilidades:

- **Transporte**: HTTP, streaming, OpenAPI y adaptación request/response.
- **Dominio**: reglas de negocio, contratos internos, agente, artifacts y materiales.
- **Infraestructura**: implementaciones concretas contra filesystem, Poppler, Node y proveedores externos.

```mermaid
flowchart TB
  Entry["src/index.ts"] --> Composition["transport/http/server.ts\nLayer composition"]

  subgraph Transport["Transport layer"]
    HttpServer["transport/http/server.ts"]
    Handlers["transport/http/handlers.ts"]
    StreamRoute["/api/tutor/chat/stream"]
  end

  subgraph Domain["Domain layer"]
    TutorService["domain/agents/academic-tutor\nTutorChatService"]
    Harness["domain/agents/harness\nAgentSession / tools / skills"]
    MaterialsDomain["domain/materials\nMaterialRepository / PdfService ports"]
    ArtifactsDomain["domain/artifacts\nArtifactRepository / grading"]
  end

  subgraph Infra["Infrastructure layer"]
    Gemini["domain/agents/gemini.ts\nGemini LanguageModel adapter"]
    FileMaterials["infra/materials\nFileMaterialRepository"]
    Poppler["infra/materials\nPopplerPdfService"]
    FileArtifacts["infra/artifacts\nFileArtifactRepository"]
    FileSessions["infra/agents\nFileSessionRepository"]
    NodePlatform["@effect/platform-node"]
  end

  subgraph External["External systems"]
    Google["Google Gemini API"]
    PopplerCli["pdfinfo / pdftoppm"]
    Data["packages/server/.data"]
  end

  Composition --> Transport
  Composition --> Domain
  Composition --> Infra

  Handlers --> TutorService
  Handlers --> MaterialsDomain
  Handlers --> ArtifactsDomain
  StreamRoute --> TutorService
  TutorService --> Harness
  Harness --> MaterialsDomain
  Harness --> ArtifactsDomain

  Gemini --> Google
  FileMaterials --> Data
  FileMaterials --> Poppler
  Poppler --> PopplerCli
  FileArtifacts --> Data
  FileSessions --> Data
  Infra --> NodePlatform
```

### Transporte

Archivos principales:

- `packages/server/src/index.ts`: arranca el runtime Node y lanza el server.
- `packages/server/src/transport/http/server.ts`: compone rutas, docs, stream NDJSON y layers.
- `packages/server/src/transport/http/handlers.ts`: implementa los endpoints definidos en `packages/shared`.

Esta capa debería saber de HTTP, schemas compartidos y serialización, pero no debería contener reglas de negocio complejas.

### Dominio

Archivos principales:

- `packages/server/src/domain/agents/*`
- `packages/server/src/domain/agents/harness/*`
- `packages/server/src/domain/artifacts/*`
- `packages/server/src/domain/materials/*`

Aquí viven los conceptos del producto: tutor, sesiones, skills, commands, materials, artifacts, attempts y grading. También se definen puertos como `MaterialRepository`, `ArtifactRepository` o `PdfService`.

El dominio debería depender de interfaces/servicios, no de detalles como filesystem, Poppler o HTTP.

### Infraestructura

Archivos principales:

- `packages/server/src/infra/agents/file-session-repository.ts`
- `packages/server/src/infra/artifacts/file-artifact-repository.ts`
- `packages/server/src/infra/materials/file-material-repository.ts`
- `packages/server/src/infra/materials/poppler-pdf-service.ts`
- `packages/server/src/domain/agents/gemini.ts`

Esta capa implementa los puertos del dominio usando tecnología concreta: archivos JSON, PDFs locales, comandos Poppler, Gemini y servicios de Node.

Nota: `gemini.ts` está bajo `domain/agents` por cercanía al agente, pero conceptualmente actúa como adapter de infraestructura para `LanguageModel`. Es una de las zonas que un candidato podría reorganizar si quiere dejar las capas más limpias.

### Regla práctica

```txt
transport -> domain <- infra
```

- Transporte llama al dominio.
- Infraestructura implementa puertos que el dominio necesita.
- El dominio no debería importar transporte ni implementaciones concretas de infraestructura.

La composición de dependencias vive principalmente en `transport/http/server.ts`, usando `Layer` de Effect y `@effect/platform-node`.

## Tutor agent

El tutor está implementado como un harness de agente con herramientas públicas:

- `load_skill`: carga instrucciones especializadas.
- `cli`: ejecuta comandos permitidos del dominio.

Las skills no se exponen como tools directas; el modelo debe cargarlas mediante `load_skill`.

```mermaid
sequenceDiagram
  participant User
  participant Web as React Chat
  participant API as /api/tutor/chat/stream
  participant Tutor as TutorChatService
  participant Harness as AgentSession
  participant Gemini
  participant CLI as Domain CLI tools
  participant Data as .data

  User->>Web: asks for a quiz
  Web->>API: POST messages
  API->>Tutor: streamMessage(input)
  Tutor->>Harness: continue session
  Harness->>Gemini: prompt + available tools
  Gemini-->>Harness: functionCall(load_skill / cli)
  Harness->>CLI: execute command
  CLI->>Data: read/write materials/artifacts
  Data-->>CLI: result
  CLI-->>Harness: tool result
  Harness->>Gemini: continue with tool result
  Gemini-->>Harness: final answer
  Harness-->>API: AgentMessage events
  API-->>Web: NDJSON message/done
```

Puntos de entrada:

- `packages/server/src/domain/agents/academic-tutor.ts`
- `packages/server/src/domain/agents/academic-tutor/tutor-chat-service.ts`
- `packages/server/src/domain/agents/harness/session.ts`

## Web: estado y UI

Entrada:

- `packages/web/src/App.tsx`

Componentes principales:

- `packages/web/src/components/Sidebar.tsx`
- `packages/web/src/components/Chat.tsx`
- `packages/web/src/components/ArtifactWorkspace.tsx`

Estado remoto con Effect Atom:

- `packages/web/src/domain/materials/atoms.ts`
- `packages/web/src/domain/artifacts/atoms.ts`
- `packages/web/src/domain/tutor/atoms.ts`

Streaming tutor:

- `packages/web/src/domain/tutor/stream.ts`

La UI mantiene estado local para cosas efímeras como input del chat, artifact seleccionado y respuestas del formulario.

## Trade-offs actuales

- Persistencia por filesystem: simple y fácil de inspeccionar, no orientada a concurrencia fuerte.
- Algunas rutas usan Effect HTTP API; el stream del chat usa NDJSON manual.
- Hay schemas de artifacts en `shared` y dominio server; hay que evitar drift si se cambian.
- El proyecto prioriza legibilidad para challenge sobre completitud productiva.
