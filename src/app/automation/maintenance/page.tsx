"use client";

import { useState } from "react";

type JobName = "revisit_due" | "recalculate_priorities";
type OutreachScope = "all" | "initial" | "followup";
type RegenerationResult = { scanned: number; stale: number; processed: number; succeeded: number; failed: number };

const jobs: Array<{ name: JobName; title: string; description: string }> = [
  { name: "revisit_due", title: "Reopen due revisits", description: "Surface not-now prospects whose configured revisit date has arrived." },
  { name: "recalculate_priorities", title: "Recalculate priorities", description: "Recompute deterministic opportunity scores using the current configured weights." },
];

export default function MaintenanceJobsPage() {
  const [running, setRunning] = useState<JobName | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [scope, setScope] = useState<OutreachScope>("all");
  const [limit, setLimit] = useState(100);
  const [regenerationResult, setRegenerationResult] = useState<RegenerationResult | null>(null);

  async function run(jobName: JobName) {
    setRunning(jobName);
    setMessage(null);
    try {
      const res = await fetch("/api/automation/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobName }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Job failed");
      setMessage(`${jobName.replaceAll("_", " ")}: ${body.succeeded ?? 0}/${body.processed ?? 0} succeeded${body.failed ? ` · ${body.failed} failed` : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(null);
    }
  }

  async function regenerateLegacyOutreach() {
    setRegenerating(true);
    setMessage(null);
    setRegenerationResult(null);
    try {
      const res = await fetch("/api/outreach/maintenance/regenerate-unsent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, limit }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Outreach regeneration failed");
      setRegenerationResult(body);
      setMessage(`Outreach maintenance complete: ${body.succeeded ?? 0} succeeded${body.failed ? ` · ${body.failed} failed` : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Maintenance Jobs</h1>
        <p className="mt-1 text-sm text-zinc-400">Lifecycle cleanup, priority maintenance, and outreach-version repair.</p>
        {message && <div className="mt-5 rounded border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm">{message}</div>}

        <section className="mt-6 rounded-xl border border-amber-800/60 bg-amber-950/20 p-5">
          <h2 className="text-lg font-semibold">Regenerate unsent outreach</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">Replace legacy or stale unsent initial drafts using the current outreach prompt. Stale follow-ups are cancelled and regenerated only when they become due. Sent and sending messages are never rewritten.</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Use this after changing outreach psychology, formatting, recipient rules, or prompt versions. Manually edited drafts remain valid.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-[220px_160px_auto] sm:items-end">
            <label className="text-sm"><span className="mb-1 block text-zinc-400">Scope</span><select value={scope} onChange={(event) => setScope(event.target.value as OutreachScope)} className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"><option value="all">All unsent outreach</option><option value="initial">Initial drafts only</option><option value="followup">Follow-ups only</option></select></label>
            <label className="text-sm"><span className="mb-1 block text-zinc-400">Maximum messages</span><input type="number" min={1} max={500} value={limit} onChange={(event) => setLimit(Math.min(500, Math.max(1, Number(event.target.value) || 1)))} className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2" /></label>
            <button disabled={regenerating || running !== null} onClick={regenerateLegacyOutreach} className="rounded bg-amber-700 px-4 py-2 text-sm font-medium hover:bg-amber-600 disabled:opacity-50">{regenerating ? "Regenerating…" : "Regenerate unsent outreach"}</button>
          </div>
          {regenerationResult && <div className="mt-5 grid gap-3 sm:grid-cols-5">{[["Scanned", regenerationResult.scanned], ["Stale", regenerationResult.stale], ["Processed", regenerationResult.processed], ["Succeeded", regenerationResult.succeeded], ["Failed", regenerationResult.failed]].map(([label, value]) => <div key={String(label)} className="rounded border border-zinc-800 bg-zinc-900 px-3 py-3"><div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div></div>)}</div>}
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {jobs.map((job) => <section key={job.name} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-semibold">{job.title}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{job.description}</p><button disabled={running !== null || regenerating} onClick={() => run(job.name)} className="mt-4 rounded bg-indigo-700 px-4 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">{running === job.name ? "Running…" : "Run now"}</button></section>)}
        </div>
      </div>
    </main>
  );
}
