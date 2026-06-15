Default to the Node.js + pnpm workflow for this repo.

- Use `pnpm install` from the root.
- Use `pnpm run <script>` from the root, or `pnpm --filter <package> run <script>` for package scripts.
- Server TypeScript entrypoints run on Node via `node --env-file=../../.env --import tsx ...`.
- Frontend dev/build uses Vite.
- Do not use Bun-specific APIs (`Bun.serve`, `Bun.file`, `bun:*`, `bun build`) in new code.

## APIs

- Server HTTP is composed with Effect HTTP API and `@effect/platform-node`.
- Prefer Effect platform services (`FileSystem`, `Path`, `ChildProcessSpawner`) at infrastructure boundaries.
- Use native `fetch`, `WebSocket`, and standard Node APIs where appropriate.
- Keep HTTP contracts in `packages/shared`.

## Testing / checks

Use the existing scripts:

```sh
pnpm run typecheck
pnpm --filter @proxus/web run build
pnpm --filter @proxus/server run typecheck
```

## Frontend

- React app lives in `packages/web/src`.
- Vite config lives in `packages/web/vite.config.ts`.
- Tailwind output is generated into `packages/web/src/styles.generated.css` by package scripts.

## AI / local config

- `.env` lives at repo root.
- `GOOGLE_GENERATIVE_AI_API_KEY` is required for the server to start.
- Poppler commands `pdfinfo` and `pdftoppm` are required for the server to start.
- Local runtime data lives under `packages/server/.data` and must not be committed.
