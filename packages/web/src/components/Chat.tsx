import { useAtom, useAtomRefresh } from "@effect/atom-react";
import type { AgentMessage } from "@proxus/shared";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery } from "../domain/materials/atoms.ts";
import { applyInvalidations, invalidationsForToolCall } from "../domain/tutor/invalidation.ts";
import { streamTutorMessage } from "../domain/tutor/stream.ts";
import { tutorMessagesAtom } from "../domain/tutor/atoms.ts";
import proxusLogo from "../assets/proxus-logo.png";
import { SparkleIcon } from "./icons.tsx";

const starterPrompts = [
  "List my uploaded materials",
  "Create a short quiz from my materials",
  "Explain the hardest concept in my notes step by step"
] as const;

type ToolMessage = Extract<AgentMessage, { readonly role: "tool-call" | "tool-result" }>;

interface ThoughtGroup {
  readonly toolMessages: readonly ToolMessage[];
  readonly seconds: number | undefined;
}

interface RenderItem {
  readonly message: AgentMessage;
  readonly thought: ThoughtGroup | undefined;
}

function groupMessages(messages: readonly AgentMessage[], thoughtSeconds: ReadonlyMap<number, number>): readonly RenderItem[] {
  const items: RenderItem[] = [];
  let buffer: ToolMessage[] = [];

  messages.forEach((message, index) => {
    if (message.role === "tool-call" || message.role === "tool-result") {
      buffer.push(message);
      return;
    }

    const thought = buffer.length > 0 ? { toolMessages: buffer, seconds: thoughtSeconds.get(index) } : undefined;
    buffer = [];
    items.push({ message, thought });
  });

  return items;
}

export function Chat() {
  const [messages, setMessages] = useAtom(tutorMessagesAtom);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const refreshArtifacts = useAtomRefresh(artifactsQuery);
  const refreshMaterials = useAtomRefresh(materialsQuery);
  const pendingInvalidations = useRef<Array<ReturnType<typeof invalidationsForToolCall>>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const thoughtSecondsRef = useRef<Map<number, number>>(new Map());
  const turnStartRef = useRef(0);

  const renderItems = useMemo(
    () => groupMessages(messages, thoughtSecondsRef.current),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const submit = async (nextInput: string) => {
    const trimmed = nextInput.trim();
    if (trimmed.length === 0 || isSending) {
      return;
    }

    setIsSending(true);
    setError(undefined);
    setInput("");
    pendingInvalidations.current = [];
    turnStartRef.current = Date.now();
    let nextIndex = messages.length;

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

        if (message.role === "assistant") {
          const seconds = Math.max(1, Math.round((Date.now() - turnStartRef.current) / 1000));
          thoughtSecondsRef.current.set(nextIndex, seconds);
        }

        setMessages((current) => [...current, message]);
        nextIndex += 1;

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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="grid h-screen max-h-screen min-w-0 grid-rows-[auto_1fr_auto_auto] bg-white max-md:h-auto max-md:max-h-none">
      <header className="flex items-center justify-between gap-4 border-slate-200 border-b px-6 py-5">
        <div>
          <p className="mb-1 font-bold text-violet-500 text-xs uppercase tracking-widest">Ephemeral session</p>
          <h1 className="m-0 font-bold text-2xl text-slate-900">Academic tutor</h1>
        </div>
        <button
          className="rounded-full border border-slate-300 px-4 py-2 text-slate-600 text-sm hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
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
                <h2 className="m-0 text-balance font-bold text-2xl text-slate-900 leading-snug">
                  Ask about your materials, notes, quizzes, or tests.
                </h2>
                <p className="mt-3 text-slate-500 text-sm">The chat history lives only in browser memory. Refreshing starts over.</p>
                <div className="mt-6 grid gap-3">
                  {starterPrompts.map((prompt) => (
                    <button
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-slate-800 transition hover:border-violet-500"
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
          : renderItems.map((item, index) => (
              <Fragment key={index}>
                {item.thought !== undefined && <ThoughtBlock thought={item.thought} />}
                <MessageBubble message={item.message} />
              </Fragment>
            ))}
        {isSending && <TypingIndicator />}
        <div ref={bottomRef} />
      </section>

      {error === undefined ? null : <p className="m-0 px-6 pb-3 text-red-500 text-sm">{error}</p>}

      <form
        className="grid grid-cols-[1fr_auto] gap-3 border-slate-200 border-t bg-white/95 px-6 pt-4 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(input);
        }}
      >
        <textarea
          className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 leading-6 outline-none focus:border-transparent focus:ring-2 focus:ring-violet-400"
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit(input);
            }
          }}
          placeholder="Ask your tutor something…"
          rows={1}
        />
        <button
          className="self-end rounded-full bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          type="submit"
          disabled={isSending || input.trim().length === 0}
        >
          {isSending ? "Thinking…" : "Send"}
        </button>
      </form>
    </main>
  );
}

function Avatar({ role }: { readonly role: "user" | "assistant" }) {
  if (role === "user") {
    return (
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-200 font-bold text-slate-700 text-xs">
        You
      </div>
    );
  }

  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 overflow-hidden p-1">
      <img src={proxusLogo} alt="Proxus" className="w-full h-full object-contain select-none pointer-events-none" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <Avatar role="assistant" />
      <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
        {[0, 1, 2].map((dot) => (
          <span
            className="size-1.5 animate-bounce rounded-full bg-slate-400"
            key={dot}
            style={{ animationDelay: `${dot * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function ThoughtBlock({ thought }: { readonly thought: ThoughtGroup }) {
  const label = thought.seconds !== undefined ? `Thought for ${thought.seconds}s` : "Thought";

  return (
    <details className="ml-11 max-w-[85%] rounded-xl border border-slate-200/60 bg-slate-50 px-3 py-1.5 text-slate-500 text-xs">
      <summary className="flex cursor-pointer select-none items-center gap-1.5">
        <SparkleIcon className="size-3" />
        {label}
      </summary>
      <div className="mt-2 grid gap-2 border-slate-200/60 border-t pt-2">
        {thought.toolMessages.map((message, index) => (
          <div key={index}>
            <p className="font-semibold text-slate-500">
              {message.role === "tool-call" ? `Called ${message.name}` : `Result from ${message.name}${message.isFailure ? " (failed)" : ""}`}
            </p>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-400">
              {JSON.stringify(message.role === "tool-call" ? message.input : message.result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </details>
  );
}

function MessageBubble({ message }: { readonly message: AgentMessage }) {
  if (message.role === "tool-call" || message.role === "tool-result") {
    return null;
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar role={message.role} />
      <article
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-violet-600 text-white"
            : "border border-slate-200 bg-slate-50 text-slate-900"
        }`}
      >
        <div className="text-[15px] leading-7">
          <Streamdown>{message.content}</Streamdown>
        </div>
      </article>
    </div>
  );
}
