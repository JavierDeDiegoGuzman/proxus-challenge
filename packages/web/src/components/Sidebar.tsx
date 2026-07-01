import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { ArtifactKind } from "@proxus/shared";
import { useRef, useState } from "react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery, uploadMaterialAction } from "../domain/materials/atoms.ts";
import { tutorMessagesAtom } from "../domain/tutor/atoms.ts";
import { DocumentIcon, NoteIcon, QuizIcon, TestIcon, UploadIcon } from "./icons.tsx";

const artifactIcons: Record<ArtifactKind, typeof NoteIcon> = {
  note: NoteIcon,
  quiz: QuizIcon,
  test: TestIcon
};

interface SidebarProps {
  readonly selectedArtifactId: string | null;
  readonly onSelectArtifact: (artifactId: string) => void;
}

export function Sidebar({ selectedArtifactId, onSelectArtifact }: SidebarProps) {
  const materials = useAtomValue(materialsQuery);
  const artifacts = useAtomValue(artifactsQuery);

  return (
    <aside className="h-screen overflow-x-hidden overflow-y-auto border-slate-200 border-r bg-white p-5 max-md:h-auto max-md:max-h-[45vh] max-md:border-r-0 max-md:border-b">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 font-extrabold text-white">
          P
        </div>
        <div>
          <strong className="block text-slate-900">Proxus Tutor</strong>
          <span className="block text-slate-500 text-sm">Academic assistant</span>
        </div>
      </div>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-slate-600 text-sm uppercase tracking-widest">Materials</h2>
        </div>
        <MaterialUploadZone />
        {AsyncResult.matchWithError(materials, {
          onInitial: () => <p className="text-slate-500">Loading materials…</p>,
          onError: (error) => <p className="text-red-500">{String(error)}</p>,
          onDefect: (defect) => <p className="text-red-500">{String(defect)}</p>,
          onSuccess: ({ value }) => value.materials.length === 0
            ? <p className="text-slate-500">No uploaded PDFs yet.</p>
            : (
                <details className="rounded-2xl border border-slate-200 bg-slate-50">
                  <summary className="cursor-pointer px-4 py-3 font-medium text-slate-900 marker:text-violet-500">
                    {value.materials.length} material{value.materials.length === 1 ? "" : "s"}
                  </summary>
                  <ul className="grid grid-cols-1 gap-2 border-slate-200 border-t p-3">
                    {value.materials.map((material) => (
                      <li className="flex min-w-0 items-start gap-2.5 rounded-xl bg-white p-3" key={material.id} title={material.title}>
                        <DocumentIcon className="mt-0.5 size-4 shrink-0 text-violet-500" />
                        <div className="min-w-0">
                          <strong className="block truncate text-slate-900">{material.title}</strong>
                          <span className="mt-1 block truncate text-slate-500 text-sm" title={material.fileName}>{material.pageCount} pages · {material.fileName}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              )
        })}
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-slate-600 text-sm uppercase tracking-widest">Artifacts</h2>
        </div>
        {AsyncResult.matchWithError(artifacts, {
          onInitial: () => <p className="text-slate-500">Loading artifacts…</p>,
          onError: (error) => <p className="text-red-500">{String(error)}</p>,
          onDefect: (defect) => <p className="text-red-500">{String(defect)}</p>,
          onSuccess: ({ value }) => value.artifacts.length === 0
            ? <p className="text-slate-500">No notes, quizzes, or tests yet.</p>
            : (
                <details className="rounded-2xl border border-slate-200 bg-slate-50">
                  <summary className="cursor-pointer px-4 py-3 font-medium text-slate-900 marker:text-violet-500">
                    {value.artifacts.length} artifact{value.artifacts.length === 1 ? "" : "s"}
                  </summary>
                  <ul className="grid grid-cols-1 gap-2 border-slate-200 border-t p-3">
                    {value.artifacts.map((artifact) => {
                      const ArtifactIcon = artifactIcons[artifact.kind];
                      return (
                        <li className="min-w-0" key={artifact.id}>
                          <button
                            className={`flex w-full min-w-0 items-start gap-2.5 rounded-xl p-3 text-left transition hover:border-violet-500 hover:bg-slate-50 ${
                              selectedArtifactId === artifact.id
                                ? "border border-violet-500 bg-violet-50"
                                : "border border-transparent bg-white"
                            }`}
                            type="button"
                            onClick={() => onSelectArtifact(artifact.id)}
                            title={artifact.title}
                          >
                            <ArtifactIcon className="mt-0.5 size-4 shrink-0 text-violet-500" />
                            <div className="min-w-0">
                              <strong className="block truncate text-slate-900">{artifact.title}</strong>
                              <span className="mt-1 block truncate text-slate-500 text-sm">{artifact.kind} · {artifact.id}</span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
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
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-center transition aspect-square transition ${
          isDraggedOver ? "border-violet-400 bg-violet-50" : "border-slate-300 bg-slate-50 hover:border-violet-500 hover:bg-violet-50/50"
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
        <UploadIcon className={`size-8 transition ${isDraggedOver ? "text-violet-500" : "text-slate-400"}`} />
        <span className="text-slate-600 text-sm font-medium leading-snug px-2">
          {isUploading ? "Uploading…" : <><span className="block">Drop a PDF here</span><span className="block text-slate-400 text-xs font-normal">or click to browse</span></>}
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
      {error !== undefined && <p className="mt-2 text-red-500 text-sm">{error}</p>}
    </div>
  );
}
