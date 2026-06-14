import { Effect } from "effect";
import * as AgentCli from "../harness/index.ts";
import {
  InvalidPageRange,
  MaterialNotFound,
  parsePageSelection,
  type MaterialRepository
} from "../../materials/material.ts";

const renderMaterialError = (error: MaterialNotFound | InvalidPageRange | { readonly _tag: "MaterialRepositoryError"; readonly reason: unknown }) => {
  switch (error._tag) {
    case "MaterialNotFound":
      return `Material not found: ${error.materialId}`;
    case "InvalidPageRange":
      return `Invalid page selection ${JSON.stringify(error.range)}: ${error.reason}`;
    case "MaterialRepositoryError":
      return `Material repository error: ${String(error.reason)}`;
  }
};

export const makeMaterialCommands = (repository: MaterialRepository) => {
  const list = AgentCli.Command.withExamples([
    { command: "materials list", description: "List all uploaded PDF materials" }
  ])(
    AgentCli.Command.withDescription("List the user's uploaded PDF materials")(
      AgentCli.Command.exec("list", {}, () =>
        repository.list().pipe(
          Effect.map((materials) => {
            if (materials.length === 0) {
              return "No PDF materials found.";
            }

            return materials.map((material) =>
              `- ${material.id}: ${material.title} (${material.pageCount} pages, file: ${material.fileName})`
            ).join("\n");
          }),
          Effect.catch((error) => Effect.succeed(renderMaterialError(error)))
        )
      )
    )
  );

  const view = AgentCli.Command.withExamples([
    { command: "materials view algebra-notes 10", description: "Render page 10 as an image" },
    { command: "materials view algebra-notes 13-20", description: "Render pages 13 through 20 as images" },
    { command: "materials view algebra-notes 10,13-20", description: "Render page 10 and pages 13 through 20" }
  ])(
    AgentCli.Command.withDescription("Render selected PDF pages as PNG images for visual reading")(
      AgentCli.Command.exec("view", {
        materialId: AgentCli.Argument.string("materialId").pipe(
          AgentCli.Argument.withDescription("Material id from `materials list`")
        ),
        pages: AgentCli.Argument.withMetavar("<pages:10,13-20>")(
          AgentCli.Argument.withDescription("Page selection like 10 or 13-20 or 10,13-20")(
            AgentCli.Argument.string("pages")
          )
        )
      }, ({ materialId, pages }) =>
        parsePageSelection(pages).pipe(
          Effect.andThen((parsedPages) => repository.renderPages(materialId, parsedPages)),
          Effect.catch((error) => Effect.succeed(renderMaterialError(error)))
        )
      )
    )
  );

  return AgentCli.Command.group("materials", [list, view] as const).pipe(
    AgentCli.Command.withDescription("Uploaded PDF material commands")
  );
};
