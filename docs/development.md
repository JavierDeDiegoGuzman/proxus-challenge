# Desarrollo local

## Requisitos

- Node.js 20+.
- pnpm.
- Poppler si vas a trabajar con PDFs:
  - macOS: `brew install poppler`
  - comandos esperados: `pdfinfo`, `pdftoppm`
- Google Gemini API key si vas a probar AI.

## Setup

```bash
pnpm install
cp .env.example .env
```

Edita `.env`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
WEB_PORT=5173
PROXUS_API_URL=http://localhost:3000
```

## Ejecutar app completa

```bash
pnpm run dev
```

Esto levanta:

- server en `http://localhost:3000`,
- web Vite en `http://localhost:5173`,
- proxy `/api/*` desde Vite hacia server.

## Ejecutar paquetes por separado

```bash
pnpm --filter @proxus/server run dev
pnpm --filter @proxus/web run dev
```

## Scripts útiles

```bash
pnpm run typecheck
pnpm --filter @proxus/web run build
pnpm --filter @proxus/server run typecheck
pnpm --filter @proxus/server run eval:tutor:artifact-authoring
```

## CLI del tutor

```bash
pnpm --filter @proxus/server run agent:tutor "list my uploaded materials"
pnpm --filter @proxus/server run agent:tutor "Crea un quiz corto de una pregunta sobre variables cualitativas"
```

Si pasas JSON al CLI y contiene espacios, envuélvelo en comillas simples:

```bash
artifacts create '{"kind":"quiz","title":"Demo","questions":[]}'
```

## Troubleshooting

### `pdfinfo` o `pdftoppm` no existe

Instala Poppler y reinicia el proceso del server.

### El server no arranca por configuración

El server valida dependencias críticas al arrancar:

- `GOOGLE_GENERATIVE_AI_API_KEY` debe existir y no estar vacía.
- `pdfinfo` y `pdftoppm` deben estar disponibles en `PATH`.

Esto es intencional: preferimos fallar temprano antes que levantar una app que fallará al primer uso de AI/PDF.

### El chat falla al llamar al modelo

Comprueba:

- `.env` existe en la raíz,
- `GOOGLE_GENERATIVE_AI_API_KEY` es válida,
- `GEMINI_MODEL` apunta a un modelo disponible.

### La web no refresca artifacts tras crear uno

El chat invalida queries al recibir tool results. Si estás debuggeando, refresca la página o revisa `packages/web/src/domain/tutor/invalidation.ts`.

### Cambié schemas y rompió todo

Es normal: `shared`, `server` y `web` están acoplados por contrato. Ejecuta `pnpm run typecheck` y arregla los errores desde `packages/shared` hacia fuera.
