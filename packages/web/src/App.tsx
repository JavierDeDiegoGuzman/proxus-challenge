import { Chat } from "./components/Chat.tsx";
import { Sidebar } from "./components/Sidebar.tsx";

export function App() {
  return (
    <div className="grid min-h-screen grid-cols-[minmax(280px,340px)_minmax(0,1fr)] bg-slate-950 text-slate-100 max-lg:grid-cols-1">
      <Sidebar />
      <Chat />
    </div>
  );
}
