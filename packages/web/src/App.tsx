import { useEffect, useState } from "react";
import { ArtifactWorkspace } from "./components/ArtifactWorkspace.tsx";
import { Chat } from "./components/Chat.tsx";
import { Sidebar } from "./components/Sidebar.tsx";

const MIN_CHAT_WIDTH = 320;
const MAX_CHAT_WIDTH = 720;

export function App() {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      const nextWidth = window.innerWidth - event.clientX;
      setChatWidth(Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, nextWidth)));
    };
    const onMouseUp = () => setIsResizing(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      className="grid h-screen min-h-screen overflow-hidden bg-white text-slate-900"
      style={{ gridTemplateColumns: `320px minmax(0, 1fr) 6px ${chatWidth}px` }}
    >
      <Sidebar selectedArtifactId={selectedArtifactId} onSelectArtifact={setSelectedArtifactId} />
      <ArtifactWorkspace artifactId={selectedArtifactId} />
      <button
        aria-label="Resize chat panel"
        className="h-full w-full cursor-col-resize border-slate-200 border-x bg-white hover:bg-sky-50"
        type="button"
        onMouseDown={() => setIsResizing(true)}
      />
      <Chat />
    </div>
  );
}
