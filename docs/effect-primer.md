# Effect primer para este repo

No necesitas dominar Effect para contribuir. En este código, úsalo mentalmente como una combinación de:

- promesas tipadas,
- errores tipados,
- inyección de dependencias,
- composición explícita de servicios.

## La firma importante

```ts
Effect.Effect<Success, Error, Requirements>
```

Léelo así:

- produce `Success`,
- puede fallar con `Error`,
- necesita dependencias `Requirements`.

Ejemplo mental:

```ts
Effect.Effect<Artifact, ArtifactRepositoryError, ArtifactRepository>
```

"Un programa que devuelve un artifact, puede fallar con errores del repo y necesita un repo de artifacts".

## `Effect.gen`

Se usa para escribir flujos async/dependientes de forma secuencial:

```ts
const program = Effect.gen(function* () {
  const repo = yield* ArtifactRepository;
  const artifact = yield* repo.get(id);
  return artifact;
});
```

`yield*` unwrappea un Effect o pide un servicio del contexto.

## Servicios con `Context.Service`

Un servicio es una dependencia tipada. En términos OO, se parece a una interfaz inyectable.

Busca ejemplos en:

- `packages/server/src/domain/artifacts/artifact.ts`
- `packages/server/src/domain/materials/material.ts`

## Implementaciones con `Layer`

Un `Layer` provee implementaciones para servicios.

Ejemplo conceptual:

```ts
const InfraLive = Layer.mergeAll(
  FileMaterialRepository.layer(".data/materials/pdfs"),
  FileArtifactRepository.layer(".data/artifacts")
);
```

La composición real del server está en:

- `packages/server/src/transport/http/server.ts`

## Schemas

Effect `Schema` se usa para validar y transformar datos en runtime, además de derivar tipos.

Dónde mirar:

- `packages/shared/src/schemas/artifact.ts`
- `packages/shared/src/schemas/material.ts`
- `packages/shared/src/schemas/agent-message.ts`

## HTTP API

El contrato HTTP vive en `packages/shared/src/api/*`. El server implementa esos endpoints con `HttpApiBuilder`; la web consume el contrato con un cliente Effect.

Esto reduce duplicación entre backend y frontend.

## Patrones de lectura recomendados

Si vienes de TypeScript/React tradicional, lee en este orden:

1. `packages/shared/src/schemas/artifact.ts`: datos puros.
2. `packages/shared/src/api/artifacts.ts`: contrato HTTP.
3. `packages/server/src/transport/http/handlers.ts`: implementación HTTP.
4. `packages/server/src/infra/artifacts/file-artifact-repository.ts`: implementación filesystem.
5. `packages/web/src/domain/artifacts/atoms.ts`: consumo en frontend.

## Pitfalls

- `Effect.orDie` convierte errores tipados en defectos. Úsalo con cuidado en código de producto.
- Si una función necesita servicios, no se ejecuta sola: hay que proveer un `Layer`.
- Cambiar schemas compartidos puede romper server y web a la vez; ejecuta `pnpm run typecheck`.
