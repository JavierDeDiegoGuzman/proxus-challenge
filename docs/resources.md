# Recursos recomendados

Esta lista no es obligatoria para completar el challenge. Sirve para orientar a personas que no hayan trabajado mucho con Effect, agentes o evals.

## Effect

- Effect docs: <https://effect.website/docs/>
- Effect Solutions: <https://www.effect.solutions>
- Effect Institute: <https://www.effect.institute/>

Lectura sugerida para este repo:

1. `Effect.Effect<Success, Error, Requirements>` como modelo mental.
2. `Context.Service` y `Layer` para dependencias.
3. `Schema` para validación runtime y contratos compartidos.
4. `Config` para fallar temprano en setup.

## Agentes AI fiables

- Anthropic — Building Effective Agents: <https://www.anthropic.com/engineering/building-effective-agents>

Ideas clave aplicables aquí:

- Empieza simple antes de añadir autonomía.
- Distingue workflows predecibles de agentes abiertos.
- Diseña tools como interfaces para el modelo, no solo como funciones técnicas.
- Muestra pasos/tool calls para mejorar transparencia y debugging.
- Usa límites claros: máximo de pasos, comandos permitidos, errores observables.

## Evals para productos AI

- Hamel Husain — Your AI Product Needs Evals: <https://hamel.dev/blog/posts/evals/>
- OpenAI — Working with evals: <https://platform.openai.com/docs/guides/evals>

Ideas clave aplicables aquí:

- Crea evals específicas del producto, no solo métricas genéricas.
- Empieza con tests baratos: estructura JSON válida, artifact creado, score esperado.
- Lee traces reales/sintéticos; no dependas solo de vibe checks.
- Usa humanos o modelo-juez para casos donde la corrección sea subjetiva.
- Versiona prompts, skills y datasets de evaluación.

## Posibles evals para este repo

- El tutor lista materiales cuando el usuario lo pide.
- El tutor crea un `quiz` válido con opciones `{ id, text }`.
- El tutor usa `materials view` antes de responder sobre un PDF concreto.
- Un intento de quiz se corrige con score y feedback por pregunta.
- El agente no inventa información cuando no hay materiales relevantes.
- Los tool errors producen una respuesta útil, no una caída de la app.
