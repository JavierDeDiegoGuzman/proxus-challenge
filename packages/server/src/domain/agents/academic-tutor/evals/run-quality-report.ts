import { Console, Effect, Layer } from "effect";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { FileSystem } from "effect";
import { GeminiModel } from "../../gemini.ts";
import { runArtifactAuthoringDataset } from "./artifact-authoring.eval.ts";
import { runTutorQualityDataset } from "./tutor-quality.eval.ts";
import { formatReport } from "./eval-support.ts";

const OUTPUT_PATH = ".data/evals/latest.json";

const ARTIFACT_AUTHORING_DESC =
  "The tutor creates valid note, quiz, and test artifacts when the user asks for academic practice material.";

const TUTOR_QUALITY_DESC =
  "Key quality checks: baseline behaviors (list materials, no fabrication), regression for the quiz-results bug fix, and Pipeline 3 short-answer judge (synonym accepted, wrong answer rejected).";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  yield* Console.log("Running artifact-authoring dataset…");
  const authoringReports = yield* runArtifactAuthoringDataset();
  yield* Console.log(formatReport("academic-tutor.artifact-authoring", authoringReports));

  yield* Console.log("\nRunning tutor-quality dataset…");
  const qualityReports = yield* runTutorQualityDataset();
  yield* Console.log(formatReport("academic-tutor.tutor-quality", qualityReports));

  const allReports = [...authoringReports, ...qualityReports];
  const passed = allReports.filter((report) => report.status === "passed").length;
  const failed = allReports.filter((report) => report.status === "failed").length;

  const report = {
    generatedAt: new Date().toISOString(),
    totals: { passed, failed, total: allReports.length },
    datasets: [
      {
        id: "academic-tutor.artifact-authoring",
        description: ARTIFACT_AUTHORING_DESC,
        cases: authoringReports
      },
      {
        id: "academic-tutor.tutor-quality",
        description: TUTOR_QUALITY_DESC,
        cases: qualityReports
      }
    ]
  };

  yield* fs.makeDirectory(".data/evals", { recursive: true });
  yield* fs.writeFileString(OUTPUT_PATH, JSON.stringify(report, null, 2));
  yield* Console.log(`\n✓ Report written to ${OUTPUT_PATH} (${passed}/${allReports.length} passed)`);
}).pipe(
  Effect.provide(Layer.mergeAll(GeminiModel, NodeServices.layer))
);

if (import.meta.main) {
  Effect.runPromise(program).catch((error) => {
    console.error("Eval run failed:", error);
    process.exit(1);
  });
}
