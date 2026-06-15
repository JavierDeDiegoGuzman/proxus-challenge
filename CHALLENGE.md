# Product Engineer Challenge

## Contexto

Proxus trabaja en experiencias educativas asistidas por AI. Este repo propone una base técnica para un tutor académico capaz de:

- consultar materiales PDF subidos,
- razonar con ayuda de Gemini,
- crear artefactos de estudio (`note`, `quiz`, `test`),
- permitir resolver ejercicios y mostrar feedback.

La app ya tiene una arquitectura funcional, pero no pretende estar terminada. La idea es que puedas demostrar cómo piensas como Product Engineer: producto, UX, backend, frontend, AI y trade-offs.

## Qué esperamos ver

No hace falta rehacer el proyecto. Elige una mejora acotada y de alto impacto. Las ideas de abajo son solo inspiración: no son exhaustivas ni limitan lo que puedes proponer.

### Posibles líneas de mejora

Producto/UX:

- Mejorar el flujo para crear, seleccionar y resolver artefactos.
- Diseñar mejores empty states cuando no hay materiales o artifacts.
- Añadir una forma guiada de importar materiales locales.
- Mejorar feedback visual durante tool calls, streaming y corrección.

Fullstack:

- Hacer más robustos los errores del chat o del workspace.
- Consolidar schemas duplicados entre dominio server y `shared`.
- Añadir tests/evals de una parte crítica.
- Mejorar observabilidad/debuggability de llamadas a tools.
- Añadir seed/reset scripts para datos demo sin commitear `.data`.

AI:

- Añadir una pequeña capacidad al tutor con buena integración end-to-end.
- Mejorar prompts/skills para que el modelo use materiales con más precisión.
- Añadir evaluaciones simples para artifact authoring o corrección.
- Diseñar guardrails para JSON inválido, tools incorrectas o respuestas incompletas.

Infra/dev experience:

- Mejorar la experiencia de setup y errores de configuración.
- Mejorar la configuración Node/Vite, scripts de seed/reset o el feedback de errores de setup.
- Añadir fixtures públicos/sintéticos para probar el flujo sin datos privados.

## Criterios de evaluación

Priorizaremos:

1. **Criterio de producto**: problema claro, solución útil, buen alcance.
2. **Calidad fullstack**: contratos, estados de UI, manejo de errores y experiencia local.
3. **Uso de AI**: prompts/tools/skills con límites claros y comportamiento observable.
4. **Arquitectura**: cambios pequeños, integrados en las capas existentes.
5. **Comunicación**: README/notes que expliquen decisiones y próximos pasos.

## Alcance sugerido

Para una prueba técnica, recomendamos una mejora que pueda entenderse en 2-4 horas de revisión. Mejor una feature pequeña, pulida y explicada que una reescritura grande.

## Cómo entregar

Incluye en tu PR o nota final:

- qué problema elegiste,
- cómo lo resolviste,
- cómo probarlo manualmente,
- qué checks ejecutaste,
- qué harías después con más tiempo.

## Restricciones útiles

- Mantén `packages/shared` como fuente de contratos entre server y web.
- Evita meter frameworks nuevos salvo que haya una razón fuerte.
- Prefiere persistencia local simple; no hace falta añadir base de datos.
- No subas secretos ni datos privados.
- Si tocas flujos AI, documenta el comportamiento esperado y los fallos conocidos.
