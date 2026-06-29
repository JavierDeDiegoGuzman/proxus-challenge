import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useRef, useState } from "react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery, uploadMaterialAction } from "../domain/materials/atoms.ts";
import { tutorMessagesAtom } from "../domain/tutor/atoms.ts";

interface SidebarProps {
  readonly selectedArtifactId: string | null;
  readonly onSelectArtifact: (artifactId: string) => void;
}

export function Sidebar({ selectedArtifactId, onSelectArtifact }: SidebarProps) {
  const materials = useAtomValue(materialsQuery);
  const artifacts = useAtomValue(artifactsQuery);

  return (
    <aside className="h-screen overflow-y-auto border-slate-800 border-r bg-slate-950 p-5 max-md:h-auto max-md:max-h-[45vh] max-md:border-r-0 max-md:border-b">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 font-extrabold text-white">
          P
        </div>
        <div>
          <strong className="block text-slate-100">Proxus Tutor</strong>
          <span className="block text-slate-400 text-sm">Academic assistant</span>
        </div>
      </div>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-widest">Materials</h2>
        </div>
        <MaterialUploadZone />
        {AsyncResult.matchWithError(materials, {
          onInitial: () => <p className="text-slate-400">Loading materials…</p>,
          onError: (error) => <p className="text-red-200">{String(error)}</p>,
          onDefect: (defect) => <p className="text-red-200">{String(defect)}</p>,
          onSuccess: ({ value }) => value.materials.length === 0
            ? <p className="text-slate-400">No uploaded PDFs yet.</p>
            : (
                <details className="rounded-2xl border border-slate-800 bg-slate-900">
                  <summary className="cursor-pointer px-4 py-3 font-medium text-slate-100 marker:text-sky-400">
                    {value.materials.length} material{value.materials.length === 1 ? "" : "s"}
                  </summary>
                  <ul className="grid gap-2 border-slate-800 border-t p-3">
                    {value.materials.map((material) => (
                      <li className="rounded-xl bg-slate-950/70 p-3" key={material.id}>
                        <strong className="block text-slate-100">{material.title}</strong>
                        <span className="mt-1 block text-slate-400 text-sm">{material.pageCount} pages · {material.fileName}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )
        })}
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-widest">Artifacts</h2>
        </div>
        {AsyncResult.matchWithError(artifacts, {
          onInitial: () => <p className="text-slate-400">Loading artifacts…</p>,
          onError: (error) => <p className="text-red-200">{String(error)}</p>,
          onDefect: (defect) => <p className="text-red-200">{String(defect)}</p>,
          onSuccess: ({ value }) => value.artifacts.length === 0
            ? <p className="text-slate-400">No notes, quizzes, or tests yet.</p>
            : (
                <details className="rounded-2xl border border-slate-800 bg-slate-900">
                  <summary className="cursor-pointer px-4 py-3 font-medium text-slate-100 marker:text-sky-400">
                    {value.artifacts.length} artifact{value.artifacts.length === 1 ? "" : "s"}
                  </summary>
                  <ul className="grid gap-2 border-slate-800 border-t p-3">
                    {value.artifacts.map((artifact) => (
                      <li key={artifact.id}>
                        <button
                          className={`w-full rounded-xl p-3 text-left transition hover:border-sky-500 hover:bg-slate-950 ${
                            selectedArtifactId === artifact.id
                              ? "border border-sky-500 bg-sky-950/40"
                              : "border border-transparent bg-slate-950/70"
                          }`}
                          type="button"
                          onClick={() => onSelectArtifact(artifact.id)}
                        >
                          <strong className="block text-slate-100">{artifact.title}</strong>
                          <span className="mt-1 block text-slate-400 text-sm">{artifact.kind} · {artifact.id}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )
        })}
      </section>
    </aside>
  );
}

function MaterialUploadZone() {
  const upload = useAtomSet(uploadMaterialAction, { mode: "promise" });
  const appendTutorMessage = useAtomSet(tutorMessagesAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const uploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only .pdf files are supported.");
      return;
    }

    setIsUploading(true);
    setError(undefined);

    try {
      const result = await upload(file);
      appendTutorMessage((current) => [...current, { role: "assistant", content: result.tutorNote }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mb-3">
      <button
        className={`grid w-full place-items-center rounded-2xl border-2 border-dashed p-4 text-center transition ${
          isDraggedOver ? "border-sky-400 bg-sky-950/30" : "border-slate-700 bg-slate-900/40 hover:border-sky-500"
        }`}
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        onDragLeave={() => setIsDraggedOver(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggedOver(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggedOver(false);
          const file = event.dataTransfer.files[0];
          if (file !== undefined) {
            void uploadFile(file);
          }
        }}
        type="button"
      >
        <span className="text-slate-300 text-sm">
          {isUploading ? "Uploading…" : "Drop a PDF here or click to browse"}
        </span>
      </button>
      <input
        accept=".pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) {
            void uploadFile(file);
          }
          event.target.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />
      {error !== undefined && <p className="mt-2 text-red-300 text-sm">{error}</p>}
    </div>
  );
}
