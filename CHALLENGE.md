# Product Engineer Challenge

## Contexto

Proxus trabaja en experiencias educativas asistidas por AI. Este repo propone una base técnica para un tutor académico capaz de:

- consultar materiales PDF subidos,
- razonar con ayuda de Gemini,
- crear artefactos de estudio (`note`, `quiz`, `test`),
- permitir resolver ejercicios y mostrar feedback.

La app ya tiene una arquitectura funcional, pero no pretende estar terminada. La idea es que puedas demostrar cómo piensas como Product Engineer: producto, UX, backend, frontend, AI y trade-offs.

## Qué esperamos ver

Esta repo es un mini MVP de un agente docente. Algunas partes, especialmente el frontend, están deliberadamente vibecodeadas: el objetivo era construir una base funcional sobre la que puedas trabajar, no entregar una app cerrada.

No buscamos una mejora pequeña ni una lista de detalles. Buscamos que uses esta base para proponer una evolución con criterio propio. Queremos ver cosas que nos sorprendan: cambios de producto, de arquitectura, de interacción con el agente o de capacidades AI que hagan que el proyecto sea claramente mejor.

Puedes tocar partes grandes del código si lo consideras necesario. Puedes rehacer flujos, UI, agente, tools, skills, schemas o arquitectura. Lo importante es que el resultado tenga sentido como producto, esté bien integrado y puedas explicar todas tus decisiones.

Los ejemplos de abajo no son una lista cerrada ni una recomendación de alcance. Solo sirven para mostrar el tipo de ambición que esperamos.

### Ejemplos de líneas de trabajo

- Rediseñar cómo debería funcionar un agente docente realmente útil.
- Cambiar la forma en la que la persona interactúa con el tutor.
- Replantear cómo el agente usa materiales, artifacts, tools y memoria.
- Convertir los quizzes/tests en una experiencia de aprendizaje más rica.
- Añadir mecanismos para evaluar si el agente está funcionando bien.
- Mejorar la arquitectura para que sea más mantenible, observable o extensible.
- Rehacer la UI para que parezca un producto más real.
- Añadir capacidades nuevas que cambien sustancialmente el valor del producto.

## Criterios de evaluación

Priorizaremos:

1. **Criterio de producto**: impacto, problema claro, solución útil y buen juicio de alcance.
2. **Calidad fullstack**: contratos, estados de UI, manejo de errores y experiencia local.
3. **Uso de AI**: prompts, tools, skills, límites claros, comportamiento observable y capacidad de evaluación.
4. **Arquitectura**: mejoras que hagan el sistema más mantenible, extensible o fácil de razonar.
5. **Código**: código de calidad, integrado con el sistema y que puedas explicar de principio a fin.
6. **Comunicación**: README/notes que expliquen decisiones, trade-offs, cómo probarlo y próximos pasos.

Nota: la arquitectura y el código de esta repo tienen decisiones deliberadamente simplificadas. Se valoran mejoras sustanciales, siempre que estén bien justificadas e integradas.

## Cómo entregar

Incluye en tu PR o nota final:

- qué problema elegiste,
- cómo lo resolviste,
- cómo probarlo manualmente,
- qué checks ejecutaste,
- qué harías después con más tiempo.

## Qué no queremos

- Cambios cosméticos o demasiado pequeños.
- Una PR que solo arregle detalles sin cambiar el valor del producto.
- Añadir autenticación o base de datos como mejora principal.
- Features grandes pero mal integradas.
- Código que no puedas explicar de principio a fin.
- Subir secretos, datos privados o contenidos no autorizados.

## Restricciones útiles

- Mantén `packages/shared` como fuente de contratos entre server y web.
- Evita meter frameworks nuevos salvo que haya una razón fuerte.
- Prefiere persistencia local simple; no hace falta añadir base de datos.
- Si tocas flujos AI, documenta el comportamiento esperado, los fallos conocidos y cómo lo evaluarías.
