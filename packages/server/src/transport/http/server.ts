import { Layer } from "effect";
import { BunHttpServer } from "@effect/platform-bun";
import { HttpRouter } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiScalar } from "effect/unstable/httpapi";
import { ProxusApi } from "@proxus/shared";
import { GeminiModel } from "../../domain/agents/gemini.ts";
import { TutorChatServiceLive } from "../../domain/agents/academic-tutor/tutor-chat-service.ts";
import { FileArtifactRepository } from "../../infra/artifacts/file-artifact-repository.ts";
import { FileMaterialRepository } from "../../infra/materials/file-material-repository.ts";
import { PopplerPdfService } from "../../infra/materials/poppler-pdf-service.ts";
import { HttpHandlersLive } from "./handlers.ts";

const ApiRoutes = HttpApiBuilder.layer(ProxusApi, {
  openapiPath: "/openapi.json"
}).pipe(
  Layer.provide(HttpHandlersLive)
);

const DocsRoute = HttpApiScalar.layer(ProxusApi, {
  path: "/docs"
});

const Routes = Layer.mergeAll(ApiRoutes, DocsRoute);

const DomainLive = Layer.mergeAll(
  TutorChatServiceLive,
  GeminiModel
);

const InfraLive = Layer.mergeAll(
  FileMaterialRepository.layer(".data/materials/pdfs").pipe(
    Layer.provide(PopplerPdfService.layer)
  ),
  FileArtifactRepository.layer(".data/artifacts")
);

export const HttpServerLive = HttpRouter.serve(Routes).pipe(
  Layer.provide(DomainLive),
  Layer.provide(InfraLive),
  Layer.provide(BunHttpServer.layer({
    port: Number(process.env.PORT ?? "3000")
  }))
);
