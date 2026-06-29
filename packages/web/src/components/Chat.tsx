import { useAtom, useAtomRefresh } from "@effect/atom-react";
import type { AgentMessage } from "@proxus/shared";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery } from "../domain/materials/atoms.ts";
import { applyInvalidations, invalidationsForToolCall } from "../domain/tutor/invalidation.ts";
import { streamTutorMessage } from "../domain/tutor/stream.ts";
import { tutorMessagesAtom } from "../domain/tutor/atoms.ts";

const starterPrompts = [
  "List my uploaded materials",
  "Create a short quiz from my materials",
  "Explain the hardest concept in my notes step by step"
] as const;

export function Chat() {
  const [messages, setMessages] = useAtom(tutorMessagesAtom);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const refreshArtifacts = useAtomRefresh(artifactsQuery);
  const refreshMaterials = useAtomRefresh(materialsQuery);
  const pendingInvalidations = useRef<Array<ReturnType<typeof invalidationsForToolCall>>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async (nextInput: string) => {
    const trimmed = nextInput.trim();
    if (trimmed.length === 0 || isSending) {
      return;
    }

    setIsSending(true);
    setError(undefined);
    pendingInvalidations.current = [];

    try {
      for await (const event of streamTutorMessage({
        input: trimmed,
        messages,
        maxSteps: 8
      })) {
        if (event.type === "done") {
          continue;
        }

        const message = event.message;
        setMessages((current) => [...current, message]);

        if (message.role === "tool-call") {
          pendingInvalidations.current.push(invalidationsForToolCall(message));
        }

        if (message.role === "tool-result") {
          const keys = pendingInvalidations.current.shift() ?? [];
          if (!message.isFailure) {
            applyInvalidations(keys, {
              refreshArtifacts,
              refreshMaterials
            });
          }
        }
      }

      setInput("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="grid h-screen max-h-screen min-w-0 grid-rows-[auto_1fr_auto_auto] bg-slate-950 max-md:h-auto max-md:max-h-none">
      <header className="flex items-center justify-between gap-4 border-slate-800 border-b px-6 py-5">
        <div>
          <p className="mb-1 font-bold text-sky-400 text-xs uppercase tracking-widest">Ephemeral session</p>
          <h1 className="m-0 font-bold text-3xl text-slate-100">Academic tutor</h1>
        </div>
        <button
          className="rounded-full border border-slate-700 px-4 py-2 text-slate-200 hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={() => setMessages([])}
          disabled={messages.length === 0}
        >
          Clear chat
        </button>
      </header>

      <section className="flex flex-col gap-4 overflow-y-auto p-6" aria-live="polite">
        {messages.length === 0
          ? (
              <div className="m-auto w-full max-w-3xl text-center">
                <h2 className="m-0 text-balance font-bold text-2xl text-slate-100 leading-snug">
                  Ask about your materials, notes, quizzes, or tests.
                </h2>
                <p className="mt-3 text-slate-400 text-sm">The chat history lives only in browser memory. Refreshing starts over.</p>
                <div className="mt-6 grid gap-3">
                  {starterPrompts.map((prompt) => (
                    <button
                      className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-200 hover:border-sky-400"
                      key={prompt}
                      type="button"
                      onClick={() => void submit(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )
          : messages.map((message, index) => <MessageBubble key={index} message={message} />)}
        <div ref={bottomRef} />
      </section>

      {error === undefined ? null : <p className="m-0 px-6 pb-3 text-red-200">{error}</p>}

      <form
        className="grid grid-cols-[1fr_auto] gap-3 border-slate-800 border-t bg-slate-950/90 px-6 pt-4 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(input);
        }}
      >
        <textarea
          className="w-full resize-y rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-transparent focus:ring-2 focus:ring-sky-400"
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          placeholder="Ask your tutor something…"
          rows={3}
        />
        <button
          className="self-end rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-slate-100 hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={isSending || input.trim().length === 0}
        >
          {isSending ? "Thinking…" : "Send"}
        </button>
      </form>
    </main>
  );
}

function MessageBubble({ message }: { readonly message: AgentMessage }) {
  if (message.role === "tool-call" || message.role === "tool-result") {
    return (
      <details className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
        <summary className="cursor-pointer">
          {message.role === "tool-call" ? `Tool call: ${message.name}` : `Tool result: ${message.name}`}
        </summary>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm">
          {JSON.stringify(message.role === "tool-call" ? message.input : message.result, null, 2)}
        </pre>
      </details>
    );
  }

  return (
    <article className={message.role === "user"
      ? "max-w-3xl self-end rounded-2xl border border-blue-700 bg-blue-950 p-4"
      : "max-w-3xl self-start rounded-2xl border border-slate-800 bg-slate-900 p-4"}
    >
      <span className="mb-2 block font-bold text-sky-400 text-xs uppercase tracking-wide">
        {message.role === "user" ? "You" : "Tutor"}
      </span>
      <div className="text-slate-100 leading-7">
        <Streamdown>{message.content}</Streamdown>
      </div>
    </article>
  );
}
