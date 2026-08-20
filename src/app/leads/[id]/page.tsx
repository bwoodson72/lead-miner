"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Dimension = { rating: string; evidence: string; evidenceSources: string[]; confidence: number };
type Finding = { id: number; category: string; title: string; evidence: string; assetCapability: string; confidence: number; significance: string; evidenceSources: string[]; createdAt: string };
type Assessment = { id: number; decision: string; assetStrength: string; dimensions: Record<string, Dimension>; performanceAssessment: Record<string, unknown>; siteCoverage: Record<string, unknown>; researchSummary: string; decisionReason: string; confidence: number; model: string; researchVersion: string; createdAt: string; findings: Finding[] };
type Message = { id: number; kind: string; sequenceNumber: number; subject: string; bodyText: string; angle: string | null; cta?: string | null; confidence?: number | null; requiresReview?: boolean; scheduledAt?: string | null; status: string; providerMessageId: string | null; providerThreadId: string | null; generatedAt: string; approvedAt: string | null; sentAt: string | null; sendError?: string | null };
type Activity = { id: number; type: string; summary: string; metadata: Record<string, unknown>; createdAt: string };
type AIJob = { id: number; type: string; status: string; model: string; promptVersion: string; packetHash?: string | null; inputTokens: number | null; cachedTokens?: number | null; outputTokens: number | null; estimatedCost: number | null; error: string | null; startedAt: string | null; completedAt: string | null; createdAt: string };
type Contact = { id: number; type: string; value: string; role: string | null; source: string | null; verificationStatus: string | null; isPrimary: boolean };
type Lead = { id: number; domain: string; businessName: string | null; landingPageUrl: string; keyword: string; category: string | null; city: string | null; region: string | null; adSource: string; lighthouseScore: number; lcp: number; cls: number | null; tbt: number | null; email: string | null; phone: string | null; address: string | null; contactPageUrl: string | null; enrichmentStatus: string | null; enrichmentNotes: string | null; emailEnrichmentStatus?: string; isAgencyManaged: boolean; agencyName: string | null; isNationalChain: boolean; chainReason: string | null; status: string; qualificationDecision: string | null; qualificationReason: string | null; priorityScore: number | null; priorityBreakdown?: Record<string, unknown> | null; primaryOutreachAngle: string | null; primaryOutreachAngleReason?: string | null; primaryOutreachAngleConfidence?: number | null; primaryOutreachFindingId?: number | null; outreachNotes: string | null; outreachNotesUpdatedAt: string | null; researchSummary: string | null; researchVersion: string | null; lastResearchedAt: string | null; assetStrength: string | null; replyStatus: string | null; replySummary: string | null; lastReplyAt: string | null; replyHandledAt?: string | null; revisitAt?: string | null; outreachCount: number; firstContactAt: string | null; lastOutreachDate: string | null; followUpDate: string | null; createdAt: string; updatedAt: string; outreachMessages: Message[]; activities: Activity[]; aiJobs: AIJob[]; suppressions: Array<{ id: number; type: string; value: string; reason: string; createdAt: string }>; contacts: Contact[] };
type ThreadMessage = { id: string; from: string | null; to?: string | null; subject?: string | null; text: string; internalDate: string };
type LeadAction = "research" | "prepare" | "revalidate" | "override";

const dimLabels: Record<string, string> = { performanceEffectiveness: "Performance effectiveness", demandAlignment: "Demand alignment", businessRepresentation: "Business representation", customerActionCapability: "Customer-action capability", acquisitionReadiness: "Acquisition readiness", siteMaturity: "Site maturity" };
const actionLabels: Record<LeadAction, string> = {
  research: "Researching lead…",
  prepare: "Preparing outreach…",
  revalidate: "Revalidating contact…",
  override: "Saving override…",
};
const actionDetails: Record<LeadAction, string> = {
  research: "Refreshing the business-asset assessment, findings, and qualification data.",
  prepare: "Calculating priority, selecting an outreach angle, and creating the initial message.",
  revalidate: "Checking the stored contact against the current business identity and site evidence.",
  override: "Saving the lead lifecycle and qualification changes.",
};
const buttonBase = "inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 active:translate-y-0.5 active:shadow-sm disabled:cursor-wait disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none";
const linkBase = "rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 active:translate-y-0.5 active:shadow-sm";

function label(v: string | null | undefined) { if (v === "optimization_candidate") return "legacy optimization — re-research"; return v ? v.replaceAll("_", " ") : "—"; }
function fmt(v: string | null | undefined) { return v ? new Date(v).toLocaleString() : "—"; }
function pct(v: number | null | undefined) { return v == null ? "—" : `${Math.round(v * 100)}%`; }
function Spinner() { return <span aria-hidden="true" className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />; }

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<LeadAction | null>(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [decisionDraft, setDecisionDraft] = useState("");
  const [outreachNotesDraft, setOutreachNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const busy = activeAction !== null || notesSaving;

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  async function load(leadId: string) {
    const [detailRes, researchRes, threadRes] = await Promise.all([
      fetch(`/api/leads/${leadId}/detail`, { cache: "no-store" }),
      fetch(`/api/leads/${leadId}/research`, { cache: "no-store" }),
      fetch(`/api/leads/${leadId}/thread`, { cache: "no-store" }),
    ]);
    const detail = await detailRes.json();
    if (!detailRes.ok) throw new Error(detail.error ?? "Lead detail failed");
    setLead(detail.lead);
    setStatusDraft(detail.lead.status);
    setDecisionDraft(detail.lead.qualificationDecision ?? "");
    setOutreachNotesDraft(detail.lead.outreachNotes ?? "");
    if (researchRes.ok) {
      const r = await researchRes.json();
      setAssessment(r.assetAssessments?.[0] ?? null);
    }
    if (threadRes.ok) {
      const t = await threadRes.json();
      setThread(t.messages ?? []);
    }
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      try { await load(id); }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); }
      finally { setLoading(false); }
    })();
  }, [id]);

  async function act(action: LeadAction, fn: () => Promise<Response>, successMessage: string) {
    if (!id || busy) return;
    setActiveAction(action);
    setError(null);
    setNotice(null);
    try {
      const res = await fn();
      const text = await res.text();
      let body: any = {};
      if (text) {
        try { body = JSON.parse(text); }
        catch { throw new Error(`Action failed (${res.status}): server returned a non-JSON response`); }
      }
      if (!res.ok || Number(body.failed ?? 0) > 0) throw new Error(body.results?.[0]?.error ?? body.error ?? "Action failed");
      await load(id);
      setNotice(successMessage);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActiveAction(null);
    }
  }

  async function override() {
    await act("override", () => fetch(`/api/leads/${id}/override`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusDraft, qualificationDecision: decisionDraft || null }),
    }), "Lead override saved.");
  }
  async function research() {
    await act("research", () => fetch(`/api/leads/${id}/research`, { method: "POST" }), "Research complete. The lead assessment and findings have been refreshed.");
  }
  async function prepare() {
    await act("prepare", () => fetch("/api/leads/bulk-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [Number(id)], action: "prepare_outreach" }),
    }), "Outreach is prepared. Open Outreach to review the draft, or Queue if it was auto-approved.");
  }
  async function revalidate() {
    await act("revalidate", () => fetch(`/api/leads/${id}/enrich-email?force=true`, { method: "POST" }), "Contact revalidation complete. Contact details and identity checks have been refreshed.");
  }
  async function saveOutreachNotes() {
    if (!id || notesSaving || activeAction) return;
    setNotesSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/leads/${id}/outreach-notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreachNotes: outreachNotesDraft.trim() || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save outreach notes");
      setLead((current) => current ? { ...current, outreachNotes: body.outreachNotes, outreachNotesUpdatedAt: body.outreachNotesUpdatedAt, updatedAt: body.updatedAt } : current);
      setOutreachNotesDraft(body.outreachNotes ?? "");
      setNotice(body.outreachNotes ? "Outreach notes saved. New or regenerated outreach will use them." : "Outreach notes cleared.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setNotesSaving(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-zinc-950 p-8 text-zinc-300">Loading lead…</main>;
  if (error && !lead) return <main className="min-h-screen bg-zinc-950 p-8 text-red-300">{error}</main>;
  if (!lead) return null;

  const selectedFinding = assessment?.findings.find((f) => f.id === lead.primaryOutreachFindingId);
  const breakdown = lead.priorityBreakdown as any;
  const legacyOptimization = lead.qualificationDecision === "optimization_candidate";
  const notesDirty = outreachNotesDraft.trim() !== (lead.outreachNotes ?? "").trim();

  return <main aria-busy={busy} className="min-h-screen bg-zinc-950 text-white"><div className="mx-auto max-w-7xl px-4 py-8">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><div className="text-xs uppercase text-zinc-500">Lead #{lead.id}</div><h1 className="text-2xl font-bold">{lead.businessName || lead.domain}</h1><div className="mt-1 text-sm text-zinc-400">{lead.domain} · {lead.email ?? "No email"} · {lead.phone ?? "No phone"}</div></div>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={research} className={`${buttonBase} bg-indigo-700 hover:bg-indigo-600 hover:shadow-indigo-950/40 focus-visible:ring-indigo-300 ${activeAction === "research" ? "ring-2 ring-indigo-300/60" : ""}`}>{activeAction === "research" ? <><Spinner />Researching…</> : lead.lastResearchedAt ? "Re-research" : "Research"}</button>
        {lead.qualificationDecision === "rebuild_candidate" && <button disabled={busy} onClick={prepare} className={`${buttonBase} bg-emerald-700 hover:bg-emerald-600 hover:shadow-emerald-950/40 focus-visible:ring-emerald-300 ${activeAction === "prepare" ? "ring-2 ring-emerald-300/60" : ""}`}>{activeAction === "prepare" ? <><Spinner />Preparing…</> : "Prepare outreach"}</button>}
        <button disabled={busy} onClick={revalidate} className={`${buttonBase} bg-zinc-700 hover:bg-zinc-600 hover:shadow-black/30 focus-visible:ring-zinc-300 ${activeAction === "revalidate" ? "ring-2 ring-zinc-300/60" : ""}`}>{activeAction === "revalidate" ? <><Spinner />Revalidating…</> : "Revalidate contact"}</button>
        <a href={lead.landingPageUrl} target="_blank" rel="noreferrer" className={linkBase}>Open website</a>
        <Link href="/dashboard" className={linkBase}>Dashboard</Link>
      </div>
    </div>

    {activeAction && <div aria-live="polite" className="mb-5 flex items-center gap-3 rounded border border-indigo-700 bg-indigo-950/45 px-4 py-3 text-sm text-indigo-100 shadow-lg shadow-indigo-950/20"><Spinner /><div><div className="font-semibold">{actionLabels[activeAction]}</div><div className="mt-0.5 text-xs text-indigo-200/70">{actionDetails[activeAction]}</div></div></div>}
    {notice && <div aria-live="polite" className="mb-5 rounded border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
    {error && <div aria-live="assertive" className="mb-5 rounded border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>}
    {legacyOptimization && <div className="mb-5 rounded border border-amber-800 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">This lead has a legacy optimization classification from the old service model. Optimization is no longer an offered service. Re-research the lead to determine whether it supports a custom Astro rebuild.</div>}

    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Status", label(lead.status)], ["Priority", lead.priorityScore ?? "—"], ["Decision", label(lead.qualificationDecision)], ["Asset strength", label(lead.assetStrength)], ["Next follow-up", fmt(lead.followUpDate)]].map(([name, value]) => <div key={String(name)} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><div className="text-xs uppercase text-zinc-500">{name}</div><div className="mt-1 font-semibold capitalize">{value}</div></div>)}</div>

    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-semibold">Operator override</h2><div className="mt-3 flex flex-wrap gap-3"><select disabled={busy} value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50">{["new", "research_pending", "qualified", "disqualified", "ready_for_outreach", "held", "contacted", "replied", "interested", "call_scheduled", "proposal_sent", "won", "lost", "rejected", "bounced", "unsubscribed", "closed_no_response"].map((s) => <option key={s}>{s}</option>)}</select><select disabled={busy} value={decisionDraft} onChange={(e) => setDecisionDraft(e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"><option value="">No qualification decision</option>{legacyOptimization && <option value="optimization_candidate" disabled>legacy optimization — re-research required</option>}{["rebuild_candidate", "no_material_opportunity", "needs_review"].map((d) => <option key={d}>{d}</option>)}</select><button disabled={busy || legacyOptimization && decisionDraft === "optimization_candidate"} onClick={override} className={`${buttonBase} bg-zinc-700 px-4 hover:bg-zinc-600 hover:shadow-black/30 focus-visible:ring-zinc-300 ${activeAction === "override" ? "ring-2 ring-zinc-300/60" : ""}`}>{activeAction === "override" ? <><Spinner />Saving…</> : "Save override"}</button></div></section>

    {assessment && <><section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-semibold">Business asset assessment</h2><div className="mt-1 text-xs text-zinc-500">{assessment.researchVersion} · {assessment.model} · {fmt(assessment.createdAt)}</div></div><div className="text-sm text-zinc-400">Confidence {pct(assessment.confidence)}</div></div><div className="mt-4 grid gap-5 lg:grid-cols-2"><div><div className="text-xs uppercase text-zinc-500">Summary</div><p className="mt-2 leading-6 text-zinc-300">{assessment.researchSummary}</p></div><div><div className="text-xs uppercase text-zinc-500">Decision reason</div><p className="mt-2 leading-6 text-zinc-300">{assessment.decisionReason}</p></div></div></section>
    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-semibold">Capabilities</h2><div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{Object.entries(assessment.dimensions).map(([key, d]) => <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><div className="flex justify-between gap-3"><span className="font-medium">{dimLabels[key] ?? label(key)}</span><span className="capitalize text-zinc-300">{d.rating}</span></div><p className="mt-3 text-sm leading-6 text-zinc-300">{d.evidence}</p><div className="mt-3 text-xs text-zinc-500">{pct(d.confidence)} · {d.evidenceSources.join(", ")}</div></div>)}</div></section>
    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-semibold">Material findings</h2><div className="mt-4 space-y-3">{assessment.findings.length ? assessment.findings.map((f) => <div key={f.id} className={`rounded-lg border p-4 ${f.id === lead.primaryOutreachFindingId ? "border-indigo-700 bg-indigo-950/20" : "border-zinc-800 bg-zinc-950"}`}><div className="flex flex-wrap justify-between gap-2"><div><div className="font-medium">{f.title}</div><div className="text-xs text-zinc-500">{label(f.category)} · {f.significance} significance</div></div><div className="text-sm text-zinc-400">{pct(f.confidence)}</div></div><p className="mt-3 text-sm text-zinc-300">{f.evidence}</p><p className="mt-2 text-sm text-zinc-400">{f.assetCapability}</p><div className="mt-2 text-xs text-zinc-600">Sources: {f.evidenceSources.join(", ")}</div></div>) : <p className="text-zinc-500">No material findings.</p>}</div></section></>}

    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Outreach notes</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">Private operator context for sales writing. New or regenerated initial outreach, follow-ups, the breakup, and suggested replies use these notes. They do not change AI research or qualification.</p></div>{lead.outreachNotesUpdatedAt && <div className="text-xs text-zinc-600">Updated {fmt(lead.outreachNotesUpdatedAt)}</div>}</div><textarea disabled={busy} maxLength={5000} rows={6} value={outreachNotesDraft} onChange={(e) => setOutreachNotesDraft(e.target.value)} placeholder="Example: Owner is actively promoting commercial roofing on Facebook. Don't lead with speed; focus on the website not reflecting the work they are selling now." className="mt-4 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-900 disabled:opacity-50"/><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-zinc-600">{outreachNotesDraft.length}/5000 characters</span><button disabled={busy || !notesDirty} onClick={saveOutreachNotes} className={`${buttonBase} bg-indigo-700 px-4 hover:bg-indigo-600 hover:shadow-indigo-950/40 focus-visible:ring-indigo-300`}>{notesSaving ? <><Spinner />Saving notes…</> : "Save notes"}</button></div></section>

    <div className="mb-6 grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-semibold">Priority & selected outreach angle</h2>{breakdown ? <div className="mt-4 grid grid-cols-2 gap-3 text-sm">{Object.entries(breakdown.scores ?? {}).map(([key, value]) => <div key={key} className="rounded bg-zinc-950 p-3"><div className="text-xs text-zinc-500">{label(key)}</div><div className="mt-1 font-semibold">{String(value)}</div></div>)}</div> : <p className="mt-3 text-sm text-zinc-500">Priority has not been calculated.</p>}<div className="mt-4 text-xs uppercase text-zinc-500">Selected angle</div><p className="mt-2 text-sm leading-6 text-zinc-300">{lead.primaryOutreachAngle ?? "—"}</p>{lead.primaryOutreachAngleReason && <p className="mt-2 text-xs leading-5 text-zinc-500">{lead.primaryOutreachAngleReason}</p>}{selectedFinding && <div className="mt-3 text-xs text-indigo-300">Backed by finding #{selectedFinding.id}: {selectedFinding.title}</div>}</section><section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-semibold">Contact & business identity</h2><div className="mt-4 space-y-2 text-sm"><div>Email: {lead.email ?? "—"}</div><div>Phone: {lead.phone ?? "—"}</div><div>Address: {lead.address ?? "—"}</div><div>Keyword: {lead.keyword}</div><div>Source: {label(lead.adSource)}</div><div>Agency managed: {lead.isAgencyManaged ? lead.agencyName ?? "yes" : "no"}</div><div>National chain: {lead.isNationalChain ? lead.chainReason ?? "yes" : "no"}</div></div>{lead.contacts?.length > 0 && <div className="mt-4 border-t border-zinc-800 pt-3">{lead.contacts.map((c) => <div key={c.id} className="text-xs text-zinc-500">{c.type}: {c.value} · {c.role ?? "unknown role"} · {c.source ?? "unknown source"}</div>)}</div>}</section></div>

    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-semibold">Outreach sequence</h2><div className="mt-4 space-y-3">{lead.outreachMessages.length ? lead.outreachMessages.map((m) => <div key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div className="font-medium">{m.kind === "initial" ? "Initial" : m.sequenceNumber === 5 ? "Follow-up 4 · breakup" : `Follow-up ${m.sequenceNumber - 1}`} · {m.subject}</div><span className="text-xs capitalize text-zinc-400">{m.status}</span></div><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{m.bodyText}</div><div className="mt-2 text-xs text-zinc-600">Generated {fmt(m.generatedAt)} · Sent {fmt(m.sentAt)}{m.scheduledAt ? ` · Scheduled ${fmt(m.scheduledAt)}` : ""}{m.sendError ? ` · Error: ${m.sendError}` : ""}</div></div>) : <p className="text-zinc-500">No outreach messages yet.</p>}</div></section>
    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-semibold">Gmail thread</h2><div className="mt-4 space-y-3">{thread.length ? thread.map((m) => <div key={m.id} className="rounded border border-zinc-800 bg-zinc-950 p-4"><div className="text-xs text-zinc-500">{m.from ?? "Unknown sender"} · {fmt(m.internalDate)}</div><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{m.text}</div></div>) : <p className="text-zinc-500">No Gmail thread yet.</p>}</div></section>
    <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-semibold">Activity timeline</h2><div className="mt-4 max-h-[650px] space-y-3 overflow-auto">{lead.activities.map((a) => <div key={a.id} className="border-l border-zinc-700 pl-3"><div className="text-sm text-zinc-200">{a.summary}</div><div className="text-xs text-zinc-600">{label(a.type)} · {fmt(a.createdAt)}</div></div>)}</div></section><section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-semibold">Raw diagnostics</h2><div className="mt-4 text-xs text-zinc-500">Crawler/site coverage</div><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-zinc-950 p-3 text-xs text-zinc-400">{JSON.stringify(assessment?.siteCoverage ?? {}, null, 2)}</pre><div className="mt-4 text-xs text-zinc-500">Performance classification</div><pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded bg-zinc-950 p-3 text-xs text-zinc-400">{JSON.stringify(assessment?.performanceAssessment ?? {}, null, 2)}</pre><div className="mt-4 text-xs text-zinc-500">AI jobs</div><div className="mt-2 space-y-2">{lead.aiJobs.map((j) => <div key={j.id} className="rounded bg-zinc-950 p-3"><div>{j.type} · {j.status} · {j.model}</div><div className="mt-1 text-zinc-600">{j.promptVersion} · in {j.inputTokens ?? 0} / cached {j.cachedTokens ?? 0} / out {j.outputTokens ?? 0} · ${Number(j.estimatedCost ?? 0).toFixed(5)}</div>{j.packetHash && <div className="mt-1 break-all text-zinc-700">packet {j.packetHash}</div>}{j.error && <div className="mt-1 text-red-400">{j.error}</div>}</div>)}</div></section></div>
  </div></main>;
}
