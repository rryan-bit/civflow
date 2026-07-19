"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type ChatAction = { label: string; href: string; summary: string };
type Message = { role: "user" | "assistant"; content: string; action?: ChatAction };

const SUGGESTIONS = [
  "What's outstanding on this project right now?",
  "Any delays reported recently?",
  "Log an RFI about the retaining wall detail",
  "Summarize progress this week.",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500"
          style={{ animation: "typing-bounce 1.1s ease-in-out infinite", animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <style>{`@keyframes typing-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-3px); opacity: 1; } }`}</style>
    </div>
  );
}

export function AskChat({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    const nextMessages: Message[] = [...messages, { role: "user", content: question.trim() }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), history: messages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't get an answer.");
        return;
      }
      setMessages([...nextMessages, { role: "assistant", content: data.answer, action: data.action }]);
    } catch {
      setError("Couldn't reach the AI assistant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      {messages.length === 0 && (
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Try asking:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-brand-orange/50 hover:bg-orange-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-slate-100"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-[28rem] overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex animate-slide-up items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              {m.role === "assistant" && (
                <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-[10px] font-semibold text-white dark:bg-brand-orange">
                  AI
                </span>
              )}
              <div className="max-w-[80%] space-y-1.5">
                {m.content && (
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                      m.role === "user"
                        ? "rounded-br-md bg-brand-navy text-white dark:bg-brand-orange"
                        : "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {m.content}
                  </div>
                )}
                {m.action && (
                  <Link
                    href={m.action.href}
                    className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span className="flex-1">{m.action.summary}</span>
                    <span className="shrink-0 text-xs font-medium underline underline-offset-2">View</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-end gap-2">
              <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-[10px] font-semibold text-white dark:bg-brand-orange">
                AI
              </span>
              <div className="rounded-2xl rounded-bl-md bg-slate-100 dark:bg-slate-800">
                <TypingDots />
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="px-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-slate-800"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this project…"
          className="field flex-1"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white transition-transform hover:bg-slate-800 disabled:opacity-40 dark:bg-brand-orange dark:hover:bg-orange-500"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
          </svg>
        </button>
      </form>
    </Card>
  );
}
