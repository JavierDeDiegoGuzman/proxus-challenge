import { AgentSkill } from "../../harness/index.ts";

export const UseUploadedMaterialsSkill = AgentSkill.make({
  name: "use-uploaded-materials",
  description: "Use uploaded PDF materials by listing them and rendering exact page ranges as images before answering material-specific questions.",
  content: [
    "# Use uploaded materials",
    "",
    "Use this skill when the user asks about uploaded PDFs, notes, slides, readings, or specific pages.",
    "",
    "Available CLI commands:",
    "- `materials list`: list uploaded PDF materials and their ids.",
    "- `materials view <materialId> <pages>`: render selected pages as images.",
    "",
    "The page selection format supports:",
    "- one page: `10`",
    "- a range: `13-20`",
    "- a mixed selection: `10,13-20`",
    "",
    "Workflow:",
    "1. If you do not know the material id, call `cli({ \"input\": \"materials list\" })`.",
    "2. When the user asks about a PDF or page range, call `materials view` with the smallest useful page range.",
    "3. Treat rendered pages as the source of truth.",
    "4. If the rendered pages do not contain enough evidence, say so clearly.",
    "5. When explaining, cite page numbers from the rendered result."
  ].join("\n")
});
