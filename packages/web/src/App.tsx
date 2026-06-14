import { useState } from "react";
import { ArtifactWorkspace } from "./components/ArtifactWorkspace.tsx";
import { Chat } from "./components/Chat.tsx";
import { Sidebar } from "./components/Sidebar.tsx";

export function App() {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

  return (
    <div
      className="grid h-screen min-h-screen overflow-hidden bg-slate-950 text-slate-100"
      style={{
        gridTemplateColumns: selectedArtifactId === null
          ? "340px minmax(0, 1fr)"
          : "340px minmax(0, 1fr) 420px"
      }}
    >
      <Sidebar selectedArtifactId={selectedArtifactId} onSelectArtifact={setSelectedArtifactId} />
      {selectedArtifactId !== null && <ArtifactWorkspace artifactId={selectedArtifactId} />}
      <Chat />
    </div>
  );
}
