"use client";

import { useEffect, useState } from "react";

type Lead = {
  id: number;
  businessName: string | null;
  domain: string;
  email: string | null;
  status: string;
  replyStatus: string | null;
  replySummary: string | null;
  lastReplyAt: string | null;
  activities: Array<{ metadata?: { recommendedAction?: string; confidence?: number } }>;
  outreachMessages: Array<{ id: number; kind: string; sequenceNumber: number; subject: string; bodyText: string; status: string; sentAt: string | null }>;
};

export default function InboxPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/inbox/actions", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load action center");
      setLeads(data.leads ?? []);
    } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function syncReplies() {
    setSyncing(true); setMessage(null);
    try {
      const res = await fetch("/api/inbox/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 100 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reply sync failed");
      setMessage(`Checked ${data.processed ?? 0} active threads.`);
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
    finally { setSyncing(false); }
  }

  async function processFollowUps() {
    setProcessing(true); setMessage(null);
    try {
      const res = await fetch("/api/followups/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 50 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Follow-up processing failed");
      const sent = (data.results ?? []).filter((r: { sent?: boolean }) => r.sent).length;
      setMessage(`Processed ${data.processed ?? 0} due leads; ${sent} follow-ups sent.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
    finally { setProcessing(false); }
  }

  return <main className="min-h-screen bg-zinc-950 text-white"><div className="mx-auto max-w-6xl px-4 py-8">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Action Center</h1><p className="mt-1 text-sm text-zinc-400">Prospect replies that need attention. Any detected reply stops automatic follow-ups.</p></div>
      <div className="flex gap-2"><button onClick={syncReplies} disabled={syncing} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50">{syncing ? "Syncing…" : "Sync Gmail Replies"}</button><button onClick={processFollowUps} disabled={processing} className="rounded bg-zinc-700 px-4 py-2 text-sm hover:bg-zinc-600 disabled:opacity-50">{processing ? "Processing…" : "Process Due Follow-ups"}</button></div>
    </div>
    {message && <div className="mb-4 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">{message}</div>}
    {loading ? <div className="py-12 text-center text-zinc-400">Loading replies…</div> : leads.length === 0 ? <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">No prospect replies currently require attention.</div> : <div className="space-y-4">
      {leads.map((lead) => {
        const meta = lead.activities?.[0]?.metadata ?? {};
        return <section key={lead.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-lg font-semibold">{lead.businessName || lead.domain}</div><div className="text-sm text-zinc-500">{lead.domain} · {lead.email ?? "No email"}</div></div><span className="rounded bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">{lead.replyStatus ?? lead.status}</span></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2"><div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Reply summary</div><p className="mt-2 text-sm leading-6 text-zinc-300">{lead.replySummary ?? "—"}</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recommended action</div><p className="mt-2 text-sm leading-6 text-zinc-300">{meta.recommendedAction ?? "Review the Gmail thread."}</p></div></div>
          <div className="mt-4 text-xs text-zinc-500">Last reply: {lead.lastReplyAt ? new Date(lead.lastReplyAt).toLocaleString() : "—"} · Outreach messages: {lead.outreachMessages.length}</div>
        </section>;
      })}
    </div>}
  </div></main>;
}
