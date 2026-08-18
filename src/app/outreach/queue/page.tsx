"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type QueueMessage = {
  id: number;
  kind: string;
  sequenceNumber: number;
  subject: string;
  bodyText: string;
  scheduledAt: string | null;
  approvedAt: string | null;
  generatedAt: string;
  status: string;
  lead: {
    id: number;
    businessName: string | null;
    domain: string;
    email: string | null;
    priorityScore: number | null;
  };
};

function sequenceLabel(message: QueueMessage) {
  if (message.kind === "initial") return "Initial";
  const followUpNumber = message.sequenceNumber - 1;
  return followUpNumber === 4 ? "Follow-up 4 · breakup" : `Follow-up ${followUpNumber}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function approvedTime(message: QueueMessage) {
  const value = message.approvedAt ?? message.generatedAt;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function priority(message: QueueMessage) {
  return message.lead.priorityScore ?? -1;
}

export default function SendQueuePage() {
  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState<Set<number>>(new Set());
  const [clock, setClock] = useState(() => Date.now());

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/outreach/review", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to load send queue");
      setMessages((body.messages ?? []).filter((message: QueueMessage) => message.status === "approved"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const { due, scheduled } = useMemo(() => {
    const approved = messages.filter((message) => message.status === "approved");
    const dueMessages = approved
      .filter((message) => !message.scheduledAt || new Date(message.scheduledAt).getTime() <= clock)
      .sort((a, b) => priority(b) - priority(a) || approvedTime(a) - approvedTime(b));
    const scheduledMessages = approved
      .filter((message) => message.scheduledAt && new Date(message.scheduledAt).getTime() > clock)
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime() || priority(b) - priority(a));
    return { due: dueMessages, scheduled: scheduledMessages };
  }, [messages, clock]);

  async function sendNow(message: QueueMessage) {
    setWorking((current) => new Set(current).add(message.id));
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/outreach/${message.id}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Send failed");
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setNotice(`Sent to ${message.lead.businessName || message.lead.domain}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setWorking((current) => {
        const next = new Set(current);
        next.delete(message.id);
        return next;
      });
    }
  }

  async function returnToDraft(message: QueueMessage) {
    setWorking((current) => new Set(current).add(message.id));
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/outreach/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft", scheduledAt: null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Update failed");
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setNotice(`${message.lead.businessName || message.lead.domain} returned to Outreach Review.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setWorking((current) => {
        const next = new Set(current);
        next.delete(message.id);
        return next;
      });
    }
  }

  function renderMessage(message: QueueMessage, state: "due" | "scheduled") {
    const isWorking = working.has(message.id);
    return (
      <article key={message.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{message.lead.businessName || message.lead.domain}</h3>
            <div className="mt-1 text-sm text-zinc-500">{message.lead.domain} · {message.lead.email ?? "No email"}</div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={state === "due" ? "rounded bg-emerald-500/15 px-2 py-1 font-medium text-emerald-300" : "rounded bg-amber-500/15 px-2 py-1 font-medium text-amber-300"}>
              {state === "due" ? "Due" : `Scheduled ${formatDate(message.scheduledAt)}`}
            </span>
            <span className="rounded bg-sky-500/15 px-2 py-1 text-sky-300">{sequenceLabel(message)}</span>
            <span className="rounded bg-indigo-500/15 px-2 py-1 text-indigo-300">Priority {message.lead.priorityScore ?? "—"}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Approved</div>
            <div className="mt-1 text-zinc-300">{formatDate(message.approvedAt)}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Scheduled send</div>
            <div className="mt-1 text-zinc-300">{message.scheduledAt ? formatDate(message.scheduledAt) : "No specific time — next eligible automation run"}</div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Subject</div>
          <div className="mt-1 text-sm font-medium text-zinc-200">{message.subject}</div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Message</div>
          <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{message.bodyText}</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={isWorking}
            onClick={() => sendNow(message)}
            className="rounded bg-indigo-700 px-3 py-2 text-sm font-medium transition-colors hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-50"
          >
            {isWorking ? "Working…" : "Send now"}
          </button>
          <button
            disabled={isWorking}
            onClick={() => returnToDraft(message)}
            className="rounded bg-amber-800 px-3 py-2 text-sm transition-colors hover:bg-amber-700 disabled:cursor-wait disabled:opacity-50"
          >
            Return to draft
          </button>
          <Link href={`/leads/${message.lead.id}`} className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white">
            View lead
          </Link>
        </div>
      </article>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Send Queue</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">
              Approved, unsent outreach. Due messages are waiting for the automated sender and its configured send window. Scheduled messages stay here until their scheduled time. Send now bypasses timing, but still uses the normal safety and daily-limit checks.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="rounded bg-zinc-800 px-3 py-2 text-sm transition-colors hover:bg-zinc-700 disabled:opacity-50">
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <Link href="/outreach" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">
              Outreach Review
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Approved unsent</div>
            <div className="mt-1 text-2xl font-bold">{messages.length}</div>
          </div>
          <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Due</div>
            <div className="mt-1 text-2xl font-bold text-emerald-200">{due.length}</div>
          </div>
          <div className="rounded-xl border border-amber-900/70 bg-amber-950/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-500">Scheduled later</div>
            <div className="mt-1 text-2xl font-bold text-amber-200">{scheduled.length}</div>
          </div>
        </div>

        {error && <div className="mt-5 rounded border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>}
        {notice && <div className="mt-5 rounded border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{notice}</div>}

        {loading && messages.length === 0 ? (
          <div className="py-12 text-center text-zinc-400">Loading send queue…</div>
        ) : messages.length === 0 ? (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <div className="text-lg font-medium text-zinc-200">Nothing is queued to send.</div>
            <p className="mt-2 text-sm text-zinc-500">Approve messages in Outreach Review and they will appear here.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            <section>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-emerald-200">Due · {due.length}</h2>
                  <p className="mt-1 text-sm text-zinc-500">Ordered by lead priority, then oldest approval first — matching the automated sender.</p>
                </div>
              </div>
              {due.length ? <div className="space-y-4">{due.map((message) => renderMessage(message, "due"))}</div> : <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-500">No approved messages are currently due.</div>}
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-amber-200">Scheduled later · {scheduled.length}</h2>
                <p className="mt-1 text-sm text-zinc-500">Ordered by scheduled time.</p>
              </div>
              {scheduled.length ? <div className="space-y-4">{scheduled.map((message) => renderMessage(message, "scheduled"))}</div> : <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-500">No approved messages are scheduled for a later time.</div>}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
