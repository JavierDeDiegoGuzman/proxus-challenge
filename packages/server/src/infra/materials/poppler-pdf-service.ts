import { Effect, FileSystem, Layer, Path } from "effect";
import { ChildProcess } from "effect/unstable/process";
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner";
import { PdfService, PdfServiceError, type PdfService as PdfServiceType } from "../../domain/materials/pdf-service.ts";

const make = (): Effect.Effect<PdfServiceType, PdfServiceError, ChildProcessSpawner | FileSystem.FileSystem | Path.Path> => Effect.gen(function* () {
  const spawner = yield* ChildProcessSpawner;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const assertExecutable = (command: string) => spawner.exitCode(
    ChildProcess.make(command, ["-v"])
  ).pipe(
    Effect.mapError((reason) => new PdfServiceError({
      reason: `Missing required Poppler command "${command}". Install Poppler so pdfinfo and pdftoppm are available on PATH. Cause: ${String(reason)}`
    })),
    Effect.flatMap((exitCode) => exitCode === 0
      ? Effect.void
      : Effect.fail(new PdfServiceError({
          reason: `Missing required Poppler command "${command}". Install Poppler so pdfinfo and pdftoppm are available on PATH. Exit code: ${exitCode}`
        }))
    )
  );

  yield* assertExecutable("pdfinfo");
  yield* assertExecutable("pdftoppm");

  const pageCount = (pdfPath: string) => spawner.string(
    ChildProcess.make("pdfinfo", [pdfPath])
  ).pipe(
    Effect.map((output) => {
      const match = /^Pages:\s+(\d+)$/m.exec(output);
      if (match === null) {
        throw new Error(`Could not read page count for ${pdfPath}`);
      }
      return Number(match[1]);
    }),
    Effect.mapError((reason) => new PdfServiceError({ reason }))
  );

  const renderPage: PdfServiceType["renderPage"] = ({ path: pdfPath, page, dpi = 144 }) => Effect.gen(function* () {
    const tempDirectory = yield* fs.makeTempDirectory({ prefix: "proxus-material-" }).pipe(
      Effect.mapError((reason) => new PdfServiceError({ reason }))
    );
    const outputPrefix = path.join(tempDirectory, `page-${page}`);
    const imagePath = `${outputPrefix}.png`;

    yield* spawner.exitCode(
      ChildProcess.make("pdftoppm", [
        "-singlefile",
        "-f",
        String(page),
        "-l",
        String(page),
        "-r",
        String(dpi),
        "-png",
        pdfPath,
        outputPrefix
      ])
    ).pipe(
      Effect.mapError((reason) => new PdfServiceError({ reason }))
    );

    const bytes = yield* fs.readFile(imagePath).pipe(
      Effect.mapError((reason) => new PdfServiceError({ reason }))
    );

    yield* fs.remove(tempDirectory, { recursive: true, force: true }).pipe(
      Effect.catch(() => Effect.void)
    );

    return {
      page,
      mediaType: "image/png" as const,
      data: `data:image/png;base64,${uint8ArrayToBase64(bytes)}`
    };
  });

  return { pageCount, renderPage };
});

export const PopplerPdfService = {
  make,
  layer: Layer.effect(PdfService)(make())
};

const uint8ArrayToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};
