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

// ─── Marker parsing ────────────────────────────────────────────────────────────

const SUGGESTIONS_RE = /%%SUGGESTIONS:\s*(\[[\s\S]*?\])%%/;
const OPEN_ARTIFACT_RE = /%%OPEN_ARTIFACT:\s*([\w-]+)%%/;
const SCORE_CARD_RE = /^%%SCORE_CARD:\s*(\{[\s\S]*?\})%%$/;

interface ScoreCardData {
  score: number;
  maxScore: number;
  wrongCount: number;
  artifactId: string;
  artifactTitle: string;
}

interface ParsedMessage {
  cleanContent: string;
  suggestions: readonly string[];
  openArtifactId: string | null;
  scoreCard: ScoreCardData | null;
}

function parseMarkers(content: string): ParsedMessage {
  let cleanContent = content;
  let suggestions: readonly string[] = [];
  let openArtifactId: string | null = null;
  let scoreCard: ScoreCardData | null = null;

  // Score card is the entire content — render as card, no text
  const cardMatch = SCORE_CARD_RE.exec(cleanContent.trim());
  if (cardMatch?.[1]) {
    try { scoreCard = JSON.parse(cardMatch[1]) as ScoreCardData; } catch {}
    return { cleanContent: "", suggestions, openArtifactId, scoreCard };
  }

  const sugMatch = SUGGESTIONS_RE.exec(cleanContent);
  if (sugMatch?.[1]) {
    try {
      const parsed: unknown = JSON.parse(sugMatch[1]);
      if (Array.isArray(parsed)) {
        suggestions = (parsed as unknown[]).filter((s): s is string => typeof s === "string");
      }
    } catch {}
    cleanContent = cleanContent.replace(sugMatch[0], "").trimEnd();
  }

  const openMatch = OPEN_ARTIFACT_RE.exec(cleanContent);
  if (openMatch?.[1]) {
    openArtifactId = openMatch[1];
    cleanContent = cleanContent.replace(openMatch[0], "").trimEnd();
  }

  return { cleanContent, suggestions, openArtifactId, scoreCard };
}

// Extract a newly created artifact id from tool results (fallback when model omits the marker)
function extractCreatedArtifactId(thought: ThoughtGroup | undefined): string | null {
  if (!thought) return null;
  for (const msg of thought.toolMessages) {
    if (msg.role === "tool-result" && !msg.isFailure) {
      try {
        const raw = typeof msg.result === "string" ? msg.result : JSON.stringify(msg.result);
        const parsed: unknown = JSON.parse(raw);
        if (
          parsed !== null &&
          typeof parsed === "object" &&
          "id" in parsed &&
          typeof (parsed as Record<string, unknown>).id === "string" &&
          ("kind" in parsed)
        ) {
          return (parsed as Record<string, unknown>).id as string;
        }
      } catch {}
    }
  }
  return null;
}

// ─── Message grouping ─────────────────────────────────────────────────────────

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

// ─── Chat component ────────────────────────────────────────────────────────────

interface ChatProps {
  onSelectArtifact: (id: string) => void;
}

export function Chat({ onSelectArtifact }: ChatProps) {
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
  const didAutoStartRef = useRef(false);

  const renderItems = useMemo(
    () => groupMessages(messages, thoughtSecondsRef.current),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const submit = async (nextInput: string) => {
    const trimmed = nextInput.trim();
    if (trimmed.length === 0 || isSending) return;

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
        if (event.type === "done") continue;

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
            applyInvalidations(keys, { refreshArtifacts, refreshMaterials });
          }
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSending(false);
    }
  };

  // Auto-start: fire whenever the chat becomes empty (mount or after clear)
  useEffect(() => {
    if (didAutoStartRef.current || messages.length > 0 || isSending) return;
    didAutoStartRef.current = true;
    void submit("__INIT__");
  // submit is stable across renders for our purposes; exhaustive-deps would add isSending which causes loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isSending]);

  const hasVisibleMessages = renderItems.some(
    (item) => item.message.role !== "user" || item.message.content !== "__INIT__"
  );

  const isInitSession = messages[0]?.role === "user" && messages[0].content === "__INIT__";
  const firstAssistantIndex = renderItems.findIndex((item) => item.message.role === "assistant");


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
          onClick={() => {
            setMessages([]);
            didAutoStartRef.current = false;
          }}
          disabled={messages.length === 0}
        >
          Clear chat
        </button>
      </header>

      <section className="flex flex-col gap-4 overflow-y-auto p-6" aria-live="polite">
        {!hasVisibleMessages && !isSending
          ? (
              <div className="m-auto w-full max-w-3xl text-center">
                <h2 className="m-0 text-balance font-bold text-2xl text-slate-900 leading-snug">
                  Ask about your materials, notes, quizzes, or tests.
                </h2>
                <p className="mt-3 text-slate-500 text-sm">The chat history lives only in browser memory. Refreshing starts over.</p>
              </div>
            )
          : renderItems.map((item, index) => (
              <Fragment key={index}>
                {item.thought !== undefined && <ThoughtBlock thought={item.thought} />}
                <MessageBubble
                  message={item.message}
                  detectedArtifactId={extractCreatedArtifactId(item.thought)}
                  isWelcome={isInitSession && index === firstAssistantIndex}
                  onSuggestionClick={(text) => void submit(text)}
                  onOpenArtifact={onSelectArtifact}
                />
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

// ─── Sub-components ────────────────────────────────────────────────────────────

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

function OptionCard({
  label,
  options,
  onSelect,
  indent = true
}: {
  readonly label: string;
  readonly options: readonly string[];
  readonly onSelect: (option: string) => void;
  readonly indent?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className={`${indent ? "ml-11" : ""} w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm`}>
      <p className="mb-2 px-1 font-semibold text-slate-400 text-xs uppercase tracking-widest">{label}</p>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setSelected(option);
              onSelect(option);
            }}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
              selected === option
                ? "border-violet-500 bg-violet-50 font-semibold text-violet-700"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}


interface ScoreCardBubbleProps {
  readonly card: ScoreCardData;
  readonly onSuggestionClick: (text: string) => void;
  readonly onOpenArtifact: (id: string) => void;
}

function ScoreCardBubble({ card, onSuggestionClick, onOpenArtifact }: ScoreCardBubbleProps) {
  const pct = card.maxScore > 0 ? Math.round((card.score / card.maxScore) * 100) : 0;
  const allCorrect = card.wrongCount === 0;
  const scoreText = pct >= 60 ? "text-emerald-600" : pct >= 30 ? "text-orange-500" : "text-red-500";
  const scoreTextSm = pct >= 60 ? "text-emerald-500" : pct >= 30 ? "text-orange-400" : "text-red-400";
  const barColor = pct >= 60 ? "bg-emerald-500" : pct >= 30 ? "bg-orange-400" : "bg-red-400";

  return (
    <div className="flex items-start gap-3">
      <Avatar role="assistant" />
      <div className="min-w-0 max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Header */}
        <p className="mb-3 font-semibold text-slate-400 text-xs uppercase tracking-widest">Result</p>

        {/* Score row */}
        <div className="mb-3 flex items-baseline gap-3">
          <span className={`font-bold text-4xl ${scoreText}`}>
            {card.score}/{card.maxScore}
          </span>
          <span className={`font-semibold text-lg ${scoreTextSm}`}>
            {pct}%
          </span>
          {allCorrect && <span className="text-emerald-500 text-sm">Perfect score! 🎉</span>}
        </div>

        {/* Progress bar */}
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Subtitle */}
        <p className="mb-4 text-slate-600 text-sm">
          {allCorrect
            ? "You got everything right. Ready for a harder challenge?"
            : card.wrongCount === 1
              ? "1 question needs review."
              : `${card.wrongCount} questions need review.`}
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {!allCorrect && (
            <button
              type="button"
              onClick={() => onSuggestionClick(`Explain what I got wrong in "${card.artifactTitle}" and help me understand the weak areas`)}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 font-semibold text-amber-700 text-sm transition hover:border-amber-400 hover:bg-amber-100"
            >
              Review weak areas
            </button>
          )}
          <button
            type="button"
            onClick={() => onSuggestionClick(`Create a new ${card.artifactTitle.toLowerCase().includes("test") ? "test" : "quiz"} similar to "${card.artifactTitle}"`)}
            className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 font-semibold text-sm text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => onSuggestionClick(`Please go through each incorrect answer in "${card.artifactTitle}" and explain why it was wrong and what the correct answer is.`)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-600 text-sm transition hover:border-slate-400"
          >
            See corrections
          </button>
        </div>
      </div>
    </div>
  );
}

const LIST_MATERIALS = "List my uploaded materials";

interface MessageBubbleProps {
  readonly message: AgentMessage;
  readonly detectedArtifactId: string | null;
  readonly isWelcome: boolean;
  readonly onSuggestionClick: (text: string) => void;
  readonly onOpenArtifact: (id: string) => void;
}

function MessageBubble({ message, detectedArtifactId, isWelcome, onSuggestionClick, onOpenArtifact }: MessageBubbleProps) {
  if (message.role === "tool-call" || message.role === "tool-result") return null;
  if (message.content === "__INIT__") return null;

  const isUser = message.role === "user";
  const { cleanContent, suggestions, openArtifactId: markerArtifactId, scoreCard } = isUser
    ? { cleanContent: message.content, suggestions: [] as string[], openArtifactId: null, scoreCard: null }
    : parseMarkers(message.content);

  const openArtifactId = markerArtifactId ?? detectedArtifactId;

  // Never show suggestion box when an artifact was just created or a score card follows
  const suppressSuggestions = openArtifactId !== null || scoreCard !== null;

  if (scoreCard !== null) {
    return (
      <ScoreCardBubble
        card={scoreCard}
        onSuggestionClick={onSuggestionClick}
        onOpenArtifact={onOpenArtifact}
      />
    );
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar role={message.role} />
      <div className={`flex min-w-0 flex-col gap-2 ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <article
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-violet-600 text-white"
              : "border border-slate-200 bg-slate-50 text-slate-900"
          }`}
        >
          <div className="text-[15px] leading-7">
            <Streamdown>{cleanContent}</Streamdown>
          </div>
        </article>

        {openArtifactId !== null && (
          <button
            type="button"
            onClick={() => onOpenArtifact(openArtifactId)}
            className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 font-semibold text-sm text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
          >
            Open in workspace →
          </button>
        )}

        {suggestions.length > 0 && !suppressSuggestions && (
          <OptionCard
            label="Select a choice"
            options={
              isWelcome && !suggestions.includes(LIST_MATERIALS)
                ? [LIST_MATERIALS, ...suggestions]
                : isWelcome
                  ? [LIST_MATERIALS, ...suggestions.filter((s) => s !== LIST_MATERIALS)]
                  : suggestions
            }
            onSelect={onSuggestionClick}
            indent={false}
          />
        )}
      </div>
    </div>
  );
}
