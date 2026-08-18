"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Finding = { id: number; category: string; title: string; evidence: string; assetCapability: string; confidence: number; significance: string };
type Assessment = { id: number; decision: string; assetStrength: string; confidence: number; findings: Finding[] };
type Message = {
  id: number;
  kind: string;
  sequenceNumber: number;
  subject: string;
  bodyText: string;
  angle: string | null;
  cta: string | null;
  confidence: number | null;
  requiresReview: boolean;
  generationReason: string | null;
  promptVersion: string | null;
  scheduledAt: string | null;
  status: string;
  generatedAt: string;
  lead: {
    id: number;
    businessName: string | null;
    domain: string;
    email: string | null;
    priorityScore: number | null;
    priorityBreakdown: unknown;
    primaryOutreachAngle: string | null;
    primaryOutreachAngleReason: string | null;
    primaryOutreachAngleConfidence: number | null;
    primaryOutreachFindingId: number | null;
    researchSummary: string | null;
    assetAssessments: Assessment[];
  };
};
type RegenerationResult = {
  scanned: number;
  stale: number;
  processed: number;
  succeeded: number;
  failed: number;
  results?: Array<{ messageId: number; leadId: number; kind: string; success: boolean; replacementMessageId?: number; action?: string; error?: string }>;
};
type OutreachStrategyDetails = {
  version?: string;
  ownerStake: string;
  buyerMoment: string | null;
  psychologicalLever: string;
  rationale?: string;
};

function sequenceLabel(message: Message) {
  if (message.kind === "initial") return "Initial";
  const n = message.sequenceNumber - 1;
  return n === 4 ? "Follow-up 4 · breakup" : `Follow-up ${n}`;
}
function pct(value: number | null) { return value == null ? "—" : `${Math.round(value * 100)}%`; }
function psychologyLabel(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function regenerationRemovalDecision(action: string | undefined) {
  if (!action?.startsWith("cancelled_after_research_not_eligible")) return null;
  const decision = action.split(":")[1];
  return decision ? decision.replaceAll("_", " ") : "not outreach-eligible";
}
function parseOutreachStrategyReason(value: string | null): OutreachStrategyDetails | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<OutreachStrategyDetails>;
    if (typeof parsed.ownerStake !== "string" || typeof parsed.psychologicalLever !== "string") return null;
    return {
      version: typeof parsed.version === "string" ? parsed.version : undefined,
      ownerStake: parsed.ownerStake,
      buyerMoment: typeof parsed.buyerMoment === "string" ? parsed.buyerMoment : null,
      psychologicalLever: parsed.psychologicalLever,
      rationale: typeof parsed.rationale === "string" ? parsed.rationale : undefined,
    };
  } catch {
    return null;
  }
}

export default function OutreachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [backfilling, setBackfilling] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [regeneratingBulk, setRegeneratingBulk] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/outreach/review", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load outreach queue");
      setMessages(data.messages ?? []);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const bulkEligible = useMemo(
    () => messages.filter((m) => selected.has(m.id) && m.status === "draft" && !m.requiresReview),
    [messages, selected],
  );
  const selectedMessages = useMemo(() => messages.filter((m) => selected.has(m.id)), [messages, selected]);

  function edit(id: number, field: "subject" | "bodyText" | "scheduledAt", value: string) {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value || null } : m));
  }

  async function patch(message: Message, status?: "draft" | "approved" | "rejected") {
    setSaving((p) => new Set(p).add(message.id));
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/outreach/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: message.subject,
          bodyText: message.bodyText,
          scheduledAt: message.scheduledAt ? new Date(message.scheduledAt).toISOString() : null,
          ...(status ? { status } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Update failed");
      if (status === "rejected") setMessages((p) => p.filter((m) => m.id !== message.id));
      else setMessages((p) => p.map((m) => m.id === message.id ? { ...m, ...body } : m));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving((p) => { const n = new Set(p); n.delete(message.id); return n; });
    }
  }

  async function send(message: Message) {
    setSaving((p) => new Set(p).add(message.id));
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/outreach/${message.id}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Send failed");
      setMessages((p) => p.filter((m) => m.id !== message.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving((p) => { const n = new Set(p); n.delete(message.id); return n; });
    }
  }

  async function regenerate(message: Message) {
    const reason = window.prompt("Why should this message be regenerated?", "Regenerate with current outreach rules");
    if (!reason) return;
    setSaving((p) => new Set(p).add(message.id));
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/outreach/${message.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Regeneration failed");
      const removedDecision = regenerationRemovalDecision(body.outcome?.action);
      await load();
      if (body.message) {
        setNotice("Message regenerated with the current research, outreach strategy, and prompt rules.");
      } else if (removedDecision) {
        setNotice(`${message.lead.businessName || message.lead.domain} was removed from the outreach queue because fresh research no longer qualified it for a custom rebuild (${removedDecision}). No replacement draft was created.`);
      } else {
        setNotice(`${message.lead.businessName || message.lead.domain} was removed from the outreach queue during regeneration. No replacement draft was created; check the lead activity for the recorded reason.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving((p) => { const n = new Set(p); n.delete(message.id); return n; });
    }
  }

  async function regenerateBulk(mode: "selected" | "stale") {
    const ids = selectedMessages.map((message) => message.id);
    if (mode === "selected" && !ids.length) return;
    const prompt = mode === "selected"
      ? `Regenerate ${ids.length} selected unsent message${ids.length === 1 ? "" : "s"} using the current outreach rules? Initial drafts will be rewritten now; selected follow-ups will be cancelled and regenerated when due.`
      : "Regenerate every stale unsent initial draft using the current outreach rules? Sent messages will not be touched.";
    if (!window.confirm(prompt)) return;

    setRegeneratingBulk(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/outreach/maintenance/regenerate-unsent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "selected"
          ? { scope: "all", ids, limit: Math.min(ids.length, 500), force: true }
          : { scope: "initial", limit: 500, force: false }),
      });
      const body = await res.json() as RegenerationResult & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Bulk regeneration failed");
      const failures = body.results?.filter((result) => !result.success) ?? [];
      const removals = body.results?.filter((result) => result.success && regenerationRemovalDecision(result.action)) ?? [];
      await load();
      if (failures.length) {
        const examples = failures.slice(0, 3).map((result) => `#${result.messageId}: ${result.error ?? "failed"}`).join(" · ");
        setError(`${body.succeeded} regenerated/cancelled; ${body.failed} failed. ${examples}`);
      } else if (body.processed === 0) {
        setNotice(mode === "stale" ? "No stale unsent initial drafts were found." : "No selected messages needed processing.");
      } else if (removals.length) {
        const decisions = [...new Set(removals.map((result) => regenerationRemovalDecision(result.action)).filter(Boolean))].join(", ");
        setNotice(`${body.succeeded} unsent message${body.succeeded === 1 ? "" : "s"} processed. ${removals.length} lead${removals.length === 1 ? " was" : "s were"} removed from the outreach queue because fresh research no longer qualified ${removals.length === 1 ? "it" : "them"} for a custom rebuild${decisions ? ` (${decisions})` : ""}.`);
      } else {
        setNotice(`${body.succeeded} unsent message${body.succeeded === 1 ? "" : "s"} processed with the current outreach rules.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRegeneratingBulk(false);
    }
  }

  async function generateMissing() {
    setBackfilling(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/outreach/review", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Draft preparation failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfilling(false);
    }
  }

  async function sendApproved() {
    setSendingAll(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/outreach/send-approved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Bulk send failed");
      if (body.failed) setError(`${body.sent} sent; ${body.failed} blocked or failed.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSendingAll(false);
    }
  }

  async function bulkApprove() {
    const ids = bulkEligible.map((m) => m.id);
    if (!ids.length) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/outreach/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Bulk approval failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Outreach Review</h1>
            <p className="mt-1 text-sm text-zinc-400">Evidence-backed initial emails and sequence follow-ups prepared by the backend.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={!selectedMessages.length || regeneratingBulk} onClick={() => regenerateBulk("selected")} className="rounded bg-violet-700 px-3 py-2 text-sm disabled:opacity-40">
              {regeneratingBulk ? "Regenerating…" : `Regenerate selected (${selectedMessages.length})`}
            </button>
            <button disabled={regeneratingBulk} onClick={() => regenerateBulk("stale")} className="rounded border border-violet-700 bg-violet-950/50 px-3 py-2 text-sm disabled:opacity-40">
              Regenerate stale initials
            </button>
            <button disabled={!bulkEligible.length} onClick={bulkApprove} className="rounded bg-emerald-800 px-3 py-2 text-sm disabled:opacity-40">Bulk approve safe ({bulkEligible.length})</button>
            <button disabled={sendingAll} onClick={sendApproved} className="rounded bg-emerald-700 px-3 py-2 text-sm disabled:opacity-50">{sendingAll ? "Sending…" : "Send approved"}</button>
            <button disabled={backfilling} onClick={generateMissing} className="rounded bg-indigo-700 px-3 py-2 text-sm disabled:opacity-50">{backfilling ? "Preparing…" : "Prepare missing outreach"}</button>
            <Link href="/automation" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Automation</Link>
            <Link href="/dashboard" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Dashboard</Link>
          </div>
        </div>

        {error && <div className="mb-5 rounded border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>}
        {notice && <div className="mb-5 rounded border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{notice}</div>}

        {loading ? (
          <div className="py-12 text-center text-zinc-400">Loading review queue…</div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-400">No drafts are waiting for review.</div>
        ) : (
          <div className="space-y-5">
            {messages.map((message) => {
              const assessment = message.lead.assetAssessments?.[0];
              const selectedFinding = assessment?.findings.find((f) => f.id === message.lead.primaryOutreachFindingId) ?? assessment?.findings[0];
              const strategyDetails = parseOutreachStrategyReason(message.lead.primaryOutreachAngleReason);
              return (
                <section key={message.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <input type="checkbox" checked={selected.has(message.id)} onChange={() => setSelected((p) => { const n = new Set(p); n.has(message.id) ? n.delete(message.id) : n.add(message.id); return n; })} />
                      <div>
                        <div className="text-lg font-semibold">{message.lead.businessName || message.lead.domain}</div>
                        <div className="text-sm text-zinc-500">{message.lead.domain} · {message.lead.email ?? "No email"}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-sky-500/15 px-2 py-1 text-sky-300">{sequenceLabel(message)}</span>
                      <span className="rounded bg-indigo-500/15 px-2 py-1 text-indigo-300">Priority {message.lead.priorityScore ?? "—"}</span>
                      <span className={message.status === "approved" ? "rounded bg-emerald-500/15 px-2 py-1 text-emerald-300" : "rounded bg-amber-500/15 px-2 py-1 text-amber-300"}>{message.status}</span>
                      <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-400">{message.promptVersion ?? "legacy/unversioned"}</span>
                      {message.requiresReview && <span className="rounded bg-red-500/15 px-2 py-1 text-red-300">review required</span>}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Selected observation</div>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{message.angle ?? message.lead.primaryOutreachAngle ?? "—"}</p>
                      <div className="mt-3 text-xs text-zinc-500">Angle confidence {pct(message.lead.primaryOutreachAngleConfidence)}</div>
                      {strategyDetails ? (
                        <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3 text-xs leading-5 text-zinc-400">
                          <div><span className="font-medium text-zinc-300">Psychology:</span> {psychologyLabel(strategyDetails.psychologicalLever)}</div>
                          <div><span className="font-medium text-zinc-300">Owner stake:</span> {strategyDetails.ownerStake}</div>
                          {strategyDetails.buyerMoment && <div><span className="font-medium text-zinc-300">Buyer moment:</span> {strategyDetails.buyerMoment}</div>}
                          {strategyDetails.rationale && <div className="text-zinc-500"><span className="font-medium text-zinc-400">Why this angle:</span> {strategyDetails.rationale}</div>}
                        </div>
                      ) : message.lead.primaryOutreachAngleReason ? (
                        <p className="mt-2 text-xs leading-5 text-zinc-500">{message.lead.primaryOutreachAngleReason}</p>
                      ) : null}
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 lg:col-span-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Evidence</div>
                      {selectedFinding ? <>
                        <div className="mt-2 font-medium text-zinc-200">{selectedFinding.title}</div>
                        <p className="mt-1 text-sm leading-6 text-zinc-400">{selectedFinding.evidence}</p>
                        <p className="mt-2 text-sm text-zinc-300">{selectedFinding.assetCapability}</p>
                        <div className="mt-2 text-xs text-zinc-500">{selectedFinding.significance} significance · {pct(selectedFinding.confidence)} confidence</div>
                      </> : <p className="mt-2 text-sm text-zinc-500">Legacy follow-up context; see prior thread.</p>}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[1fr_240px]">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">Subject
                      <input value={message.subject} onChange={(e) => edit(message.id, "subject", e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-white" />
                    </label>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">Scheduled send
                      <input type="datetime-local" value={message.scheduledAt ? new Date(message.scheduledAt).toISOString().slice(0, 16) : ""} onChange={(e) => edit(message.id, "scheduledAt", e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-white" />
                    </label>
                  </div>

                  <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Message
                    <textarea rows={8} value={message.bodyText} onChange={(e) => edit(message.id, "bodyText", e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-normal normal-case leading-6 text-white" />
                  </label>

                  <details className="mt-3 rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-400">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-500">Export-safe copy</summary>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Subject</div>
                    <p className="mt-1 text-sm text-zinc-200">{message.subject}</p>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Message</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{message.bodyText}</div>
                  </details>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span>Draft confidence {pct(message.confidence)}</span>
                    <span>CTA: {message.cta ?? "—"}</span>
                    {message.generationReason && <span>Regenerated: {message.generationReason}</span>}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button disabled={saving.has(message.id)} onClick={() => patch(message)} className="rounded bg-zinc-700 px-3 py-2 text-sm disabled:opacity-50">Save edits</button>
                    <button disabled={saving.has(message.id)} onClick={() => patch(message, "approved")} className="rounded bg-emerald-700 px-3 py-2 text-sm disabled:opacity-50">Approve</button>
                    {message.status === "approved" && <button disabled={saving.has(message.id)} onClick={() => send(message)} className="rounded bg-indigo-700 px-3 py-2 text-sm disabled:opacity-50">Send now</button>}
                    <button disabled={saving.has(message.id) || message.kind !== "initial"} onClick={() => regenerate(message)} className="rounded bg-violet-800 px-3 py-2 text-sm disabled:opacity-40">Regenerate</button>
                    <button disabled={saving.has(message.id)} onClick={() => patch(message, "draft")} className="rounded bg-amber-800 px-3 py-2 text-sm disabled:opacity-50">Return to draft</button>
                    <button disabled={saving.has(message.id)} onClick={() => patch(message, "rejected")} className="rounded bg-red-800 px-3 py-2 text-sm disabled:opacity-50">Reject & hold lead</button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
