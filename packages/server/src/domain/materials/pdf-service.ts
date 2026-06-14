import { Context, Data, Effect } from "effect";
import type { PageImage } from "./material.ts";

export class PdfServiceError extends Data.TaggedError("PdfServiceError")<{
  readonly reason: unknown;
}> {}

export interface PdfService {
  readonly pageCount: (path: string) => Effect.Effect<number, PdfServiceError>;
  readonly renderPage: (input: {
    readonly path: string;
    readonly page: number;
    readonly dpi?: number;
  }) => Effect.Effect<PageImage, PdfServiceError>;
}

export const PdfService = Context.Service<PdfService>(
  "@proxus/server/materials/PdfService"
);
