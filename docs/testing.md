# Testing y QA

## Checks automáticos

Desde la raíz:

```bash
pnpm run typecheck
pnpm --filter @proxus/web run build
```

Para backend solamente:

```bash
pnpm --filter @proxus/server run typecheck
```

## Evals / smoke tests AI

Requieren `.env` con `GOOGLE_GENERATIVE_AI_API_KEY`.

```bash
pnpm --filter @proxus/server run eval:tutor:artifact-authoring
pnpm --filter @proxus/server run agent:tutor "Crea un quiz corto de una pregunta sobre variables cualitativas"
```

## QA manual recomendado

1. Arranca app completa:

   ```bash
   pnpm run dev
   ```

2. Abre `http://localhost:5173`.
3. Comprueba que la sidebar lista materiales y artifacts.
4. Pide al tutor crear un quiz.
5. Selecciona el artifact creado.
6. Responde preguntas y envía intento.
7. Verifica:
   - score total,
   - corrección por pregunta,
   - opción `try again`,
   - layout sin workspace cuando no hay artifact seleccionado.

## Qué reportar en una entrega

- Checks ejecutados y resultado.
- Flujo manual probado.
- Limitaciones conocidas.
- Si no se pudo probar AI por falta de API key, indícalo explícitamente.
