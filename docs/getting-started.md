# Empezar a organizar la repo

Esta guía es el recorrido recomendado para orientarte en la repo y dejar listos materiales PDF locales para probar el tutor.

## 1. Ubícate en el monorepo

```txt
packages/
  shared/      # Contratos HTTP y schemas compartidos
  server/      # API, agent, tools, materiales y artifacts
  web/         # UI React + Vite
  ai-google/   # Integración Gemini para Effect AI

docs/          # Documentación del challenge y decisiones operativas
```

Lectura mínima para arrancar:

1. [`CHALLENGE.md`](../CHALLENGE.md): qué se espera de la entrega.
2. [`docs/development.md`](./development.md): setup local y scripts.
3. [`docs/architecture.md`](./architecture.md): mapa de paquetes/capas.
4. [`docs/data.md`](./data.md): storage local y datos generados.

## 2. Instala y configura entorno

Desde la raíz:

```bash
pnpm install
cp .env.example .env
```

Edita `.env` y añade al menos:

```env
GOOGLE_GENERATIVE_AI_API_KEY=...
```

Puedes obtener una API key de Gemini en Google AI Studio: <https://aistudio.google.com>.

Si vas a usar PDFs, instala Poppler:

```bash
brew install poppler
which pdfinfo
which pdftoppm
```

El server valida `pdfinfo` y `pdftoppm` al arrancar.

## 3. Dónde van los PDFs

Los PDFs locales no se commitean. Van en:

```txt
packages/server/.data/materials/pdfs/
```

Crea la carpeta y copia tus PDFs:

```bash
mkdir -p packages/server/.data/materials/pdfs
cp /ruta/a/material.pdf packages/server/.data/materials/pdfs/
```

`.data` está ignorado por git, así que puedes usar materiales locales sin ensuciar la PR.

## 4. Cómo nombrar los PDFs

El `materialId` que usa el tutor sale del nombre del archivo sin `.pdf`.

Ejemplo:

```txt
packages/server/.data/materials/pdfs/algebra-basica.pdf
```

Aparecerá como:

```txt
materialId: algebra-basica
```

Recomendaciones:

- Usa nombres cortos y estables: `estadistica-tema-1.pdf`, `algebra-basica.pdf`.
- Evita espacios, acentos y símbolos raros si vas a pedir IDs a mano.
- Usa PDFs públicos, sintéticos o propios.
- No metas apuntes privados, exámenes no autorizados, datos de estudiantes ni documentación propietaria.

## 5. Comprueba que el tutor ve los materiales

Arranca la app completa:

```bash
pnpm run dev
```

O prueba solo el CLI del tutor:

```bash
pnpm --filter @proxus/server run agent:tutor "list my uploaded materials"
```

Deberías ver algo como:

```txt
- algebra-basica: algebra-basica (12 pages, file: algebra-basica.pdf)
```

Para pedirle que use páginas concretas:

```bash
pnpm --filter @proxus/server run agent:tutor "Lee algebra-basica páginas 2-3 y crea un quiz corto"
```

Internamente el agente usa estos comandos:

```txt
materials list
materials view <materialId> <pages>
```

Ejemplos de selección de páginas:

```txt
materials view algebra-basica 2
materials view algebra-basica 2-4
materials view algebra-basica 2,5-7
```

## 6. Qué sí versionar si necesitas material demo

No subas `packages/server/.data`. Si una mejora necesita datos reproducibles, usa una de estas opciones:

```txt
packages/server/fixtures/materials/demo.pdf
packages/server/fixtures/artifacts/*.json
```

Y documenta cómo copiarlos o generarlos hacia `.data`, por ejemplo con un script `seed:demo`.

## 7. Flujo recomendado para explorar

1. Añade 1-2 PDFs pequeños a `.data/materials/pdfs`.
2. Ejecuta `pnpm run dev`.
3. En la web, comprueba que aparecen en la sidebar.
4. Pide al tutor que liste materiales.
5. Pide una nota, quiz o test basado en páginas concretas.
6. Abre el artifact generado y prueba resolverlo.
7. Antes de entregar cambios, ejecuta los checks de [`docs/testing.md`](./testing.md).

## Problemas frecuentes

### No aparece ningún PDF

Comprueba:

```bash
ls packages/server/.data/materials/pdfs
pnpm --filter @proxus/server run agent:tutor "list my uploaded materials"
```

Asegúrate de que los archivos terminan en `.pdf`.

### Error de Poppler

Instala Poppler y verifica que los comandos están en `PATH`:

```bash
brew install poppler
pdfinfo -v
pdftoppm -v
```

### El tutor no usa el PDF

Pídele explícitamente que use un material y páginas concretas:

```txt
Usa el material algebra-basica, páginas 2-4, y crea 3 preguntas tipo quiz.
```
