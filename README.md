# Proxus Product Engineer Challenge

Template de inicio para explorar un caso fullstack + AI inspirado en Proxus: un tutor académico que usa materiales PDF, crea artefactos de estudio y permite resolver quizzes/tests desde una UI web.

El objetivo del repo no es ser una app cerrada, sino una base razonable para que una persona candidata pueda demostrar criterio de producto, arquitectura fullstack y uso pragmático de AI.

## Stack

- Monorepo con `pnpm` workspaces.
- Runtime backend: Node.js.
- Backend: TypeScript, Effect v4 beta, Effect HTTP API, Gemini.
- Frontend: React 19, Vite, Tailwind v4, `@effect/atom-react`.
- Contratos compartidos: `packages/shared`.
- Persistencia local simple: filesystem bajo `packages/server/.data` (`.data` está ignorado por git).
- PDFs: Poppler (`pdfinfo`, `pdftoppm`) para renderizar páginas que Gemini puede analizar como imágenes.

## Estructura

```txt
packages/
  shared/      # Schemas y contratos HTTP compartidos entre server y web
  server/      # Backend Node + Effect, tutor agent, materiales y artifacts
  web/         # App React + proxy /api hacia el backend
  ai-google/   # Integración local con Gemini para Effect AI

docs/
  architecture.md     # Mapa de arquitectura actual
  development.md      # Setup, scripts y troubleshooting
  effect-primer.md    # Lectura rápida de Effect para este repo
  ai-agent.md         # Cómo funciona el tutor/agent harness
  api.md              # Endpoints principales
  testing.md          # Checks y QA manual
  data.md             # Datos locales y storage
  resources.md        # Referencias externas sobre Effect, AI agents y evals
```

## Quickstart

Requisitos:

- Node.js 20+.
- pnpm instalado.
- Poppler instalado (`pdfinfo` y `pdftoppm`) si quieres usar PDFs.
- Una API key de Google Gemini para probar el agente AI.

Instala dependencias:

```bash
pnpm install
```

Configura entorno:

```bash
cp .env.example .env
# edita GOOGLE_GENERATIVE_AI_API_KEY
```

Arranca backend + frontend:

```bash
pnpm run dev
```

URLs por defecto:

- Web: <http://localhost:5173>
- API: <http://localhost:3000>
- Docs OpenAPI/Scalar: <http://localhost:3000/docs>
- OpenAPI JSON: <http://localhost:3000/openapi.json>

## Comandos útiles

```bash
pnpm run typecheck
pnpm --filter @proxus/web run build
pnpm --filter @proxus/server run agent:tutor "list my uploaded materials"
pnpm --filter @proxus/server run agent:tutor "Crea un quiz corto de una pregunta"
```

## Por dónde empezar si estás evaluando el proyecto

1. Lee [`CHALLENGE.md`](./CHALLENGE.md) para entender el contexto y cómo enfocar una mejora.
2. Lee [`docs/architecture.md`](./docs/architecture.md) para ubicarte en paquetes y capas.
3. Si Effect no te resulta familiar, lee [`docs/effect-primer.md`](./docs/effect-primer.md) y [`docs/resources.md`](./docs/resources.md).
4. Ejecuta `pnpm run dev` y prueba el flujo:
   - lista materiales,
   - pide al tutor crear un quiz,
   - abre el artefacto en el workspace,
   - resuélvelo y revisa correcciones.
5. Si necesitas materiales locales, sigue [`docs/data.md`](./docs/data.md); no subas `.data`.
6. Antes de entregar cambios, ejecuta [`docs/testing.md`](./docs/testing.md).

## Nota sobre runtime y package manager

El monorepo se instala y se orquesta con `pnpm`. El server corre en Node usando `tsx` para ejecutar TypeScript en desarrollo; la web corre con Vite.
