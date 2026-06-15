# Datos locales

El server usa storage local bajo `packages/server/.data`. Esa carpeta está ignorada por git y no debe subirse a la repo.

## Layout esperado

```txt
packages/server/.data/
  agent-sessions/
    <sessionId>.json
  artifacts/
    artifacts/
      <artifactId>.json
    attempts/
      <attemptId>.json
  materials/
    pdfs/
      *.pdf
```

## Materials

Los PDFs viven en:

```txt
packages/server/.data/materials/pdfs/
```

El repo espera que Poppler esté instalado para inspeccionar/renderizar PDFs:

- `pdfinfo`
- `pdftoppm`

El tutor puede usar:

```txt
materials list
materials view <materialId> <pages>
```

`materials view` renderiza páginas como imágenes para Gemini multimodal.

## Artifacts

Los artifacts creados por el tutor o por comandos se guardan como JSON.

Kinds:

- `note`
- `quiz`
- `test`

Attempts:

- `ungraded`
- `graded`

Las correcciones viven dentro del attempt; no hay entidad `Review` separada.

## Reset local

Para limpiar datos generados, para el server y borra selectivamente:

```bash
rm -rf packages/server/.data/artifacts
rm -rf packages/server/.data/agent-sessions
```

No borres `materials/pdfs` si quieres conservar PDFs de prueba.

## Añadir contenidos para empezar

No hay seed data commiteada dentro de `.data`. Para probar el flujo con tus propios materiales locales:

```bash
mkdir -p packages/server/.data/materials/pdfs
cp /ruta/a/un-pdf-publico-o-sintetico.pdf packages/server/.data/materials/pdfs/
```

Después arranca el server y pide al tutor:

```bash
pnpm --filter @proxus/server run agent:tutor "list my uploaded materials"
pnpm --filter @proxus/server run agent:tutor "Crea un quiz corto usando los materiales disponibles"
```

Usa PDFs públicos, sintéticos o propios. No uses apuntes privados, exámenes no autorizados, datos de estudiantes ni documentación propietaria en una PR.

## Estrategia recomendada si quieres aportar datos demo

No commitees `packages/server/.data`. Si una mejora necesita contenido de ejemplo, preferimos una de estas opciones:

1. Añadir fixtures públicos/sintéticos fuera de `.data`, por ejemplo:

   ```txt
   packages/server/fixtures/materials/demo.pdf
   packages/server/fixtures/artifacts/*.json
   ```

2. Añadir un script tipo `seed:demo` que copie o genere esos fixtures hacia `.data`.
3. Documentar el origen/licencia del material demo.

## Semillas

No dependas de datos locales no versionados para una feature crítica. Si tu cambio requiere datos de ejemplo, documenta cómo crearlos o añade un script pequeño que los genere sin secretos.
