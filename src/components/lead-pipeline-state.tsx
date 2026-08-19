"use client";

import { useEffect, useState } from "react";

type PipelineState = {
  leadId: number;
  businessName: string | null;
  status: string;
  adSource: string;
  keyword: string;
  city: string | null;
  region: string | null;
  createdAt: string;
  screeningStatus: string;
  performanceOpportunity: string;
  researchEligible: boolean;
  researchQueueScore: number | null;
  researchQueueBreakdown: {
    acquisitionIntent: number;
    performanceSignal: number;
    screeningCompleteness: number;
    listingIdentity: number;
    aging: number;
    ageDays: number;
    total: number;
  } | null;
  lastResearchedAt: string | null;
  qualificationDecision: string | null;
  assessment: {
    decision: string;
    confidence: number;
    assetStrength: string;
    topFinding: { title: string; category: string; confidence: number; significance: string } | null;
  } | null;
  salesPriority: number | null;
  selectedOutreachFinding: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactState: "not_required" | "waiting" | "retry_scheduled" | "exhausted" | "ready";
  emailEnrichmentStatus: string;
  emailEnrichmentReason: string | null;
  nextEmailEnrichmentAt: string | null;
};

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "—";
}

function shortDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function contactCopy(state: PipelineState) {
  switch (state.contactState) {
    case "not_required": return "Contact lookup waits until rebuild qualification.";
    case "waiting": return "Rebuild qualified; usable email still needed.";
    case "retry_scheduled": return `Contact retry scheduled${state.nextEmailEnrichmentAt ? ` for ${new Date(state.nextEmailEnrichmentAt).toLocaleString()}` : ""}.`;
    case "exhausted": return "Automated email discovery is exhausted; manual contact review is needed.";
    case "ready": return "Usable email found; sales/outreach preparation can continue.";
  }
}

function stageClass(active: boolean) {
  return active ? "border-zinc-700 bg-zinc-900" : "border-zinc-800/80 bg-zinc-950/60";
}

function Stage({ title, active = true, children }: { title: string; active?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border p-3 ${stageClass(active)}`}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{title}</div>
      <div className="space-y-1 text-xs leading-5 text-zinc-300">{children}</div>
    </div>
  );
}

export default function LeadPipelineState({ leadId }: { leadId: string }) {
  const [state, setState] = useState<PipelineState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const response = await fetch(`/api/leads/${leadId}/pipeline-state`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Pipeline state failed");
        if (!cancelled) { setState(body as PipelineState); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 10_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [leadId]);

  if (error && !state) {
    return <div className="border-b border-red-950 bg-red-950/20"><div className="mx-auto max-w-7xl px-4 py-2 text-xs text-red-300">Pipeline state unavailable: {error}</div></div>;
  }
  if (!state) return null;

  const researched = Boolean(state.lastResearchedAt);
  const qualified = Boolean(state.qualificationDecision);
  const contactRequired = state.qualificationDecision === "rebuild_candidate";

  return (
    <div className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Lead progression</div>
            <div className="mt-1 text-sm text-zinc-300">Discovery → site screen → AI assessment → sales/contact → outreach</div>
          </div>
          <div className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs capitalize text-zinc-300">Current status: {label(state.status)}</div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Stage title="Discovery">
            <div><span className="text-zinc-500">Source:</span> {state.adSource === "paid_ad" ? "Paid advertiser" : "Organic business"}</div>
            <div><span className="text-zinc-500">Keyword:</span> {state.keyword}</div>
            <div><span className="text-zinc-500">Market:</span> {[state.city, state.region].filter(Boolean).join(", ") || "Not captured"}</div>
            <div><span className="text-zinc-500">Saved:</span> {shortDate(state.createdAt)}</div>
          </Stage>

          <Stage title="Site screen">
            <div><span className="text-zinc-500">Performance signal:</span> <span className="capitalize">{label(state.performanceOpportunity)}</span></div>
            <div><span className="text-zinc-500">Screen:</span> <span className="capitalize">{label(state.screeningStatus)}</span></div>
            <div><span className="text-zinc-500">Research order:</span> {state.researchEligible ? state.researchQueueScore ?? "—" : researched ? "completed" : "not queued"}</div>
            {state.researchEligible && state.researchQueueBreakdown && <div className="text-zinc-500">Intent {state.researchQueueBreakdown.acquisitionIntent} · performance {state.researchQueueBreakdown.performanceSignal} · identity {state.researchQueueBreakdown.listingIdentity} · age {state.researchQueueBreakdown.aging}</div>}
          </Stage>

          <Stage title="AI assessment" active={researched || state.researchEligible}>
            <div><span className="text-zinc-500">Research:</span> {researched ? shortDate(state.lastResearchedAt) : state.researchEligible ? "Queued" : "Pending"}</div>
            <div><span className="text-zinc-500">Decision:</span> <span className="capitalize">{label(state.qualificationDecision)}</span></div>
            <div><span className="text-zinc-500">Asset:</span> <span className="capitalize">{label(state.assessment?.assetStrength)}</span></div>
            <div><span className="text-zinc-500">Confidence:</span> {state.assessment ? `${Math.round(state.assessment.confidence * 100)}%` : "—"}</div>
            {state.assessment?.topFinding && <div className="text-zinc-400">Top finding: {state.assessment.topFinding.title}</div>}
          </Stage>

          <Stage title="Sales / contact" active={qualified}>
            <div><span className="text-zinc-500">Sales priority:</span> {state.salesPriority ?? "—"}</div>
            <div><span className="text-zinc-500">Selected finding:</span> {state.selectedOutreachFinding || "—"}</div>
            <div><span className="text-zinc-500">Contact:</span> <span className="capitalize">{label(state.contactState)}</span></div>
            <div>{state.email || "No email"}{state.phone ? ` · ${state.phone}` : ""}</div>
            {contactRequired && <div className={state.contactState === "exhausted" ? "text-red-300/80" : "text-zinc-500"}>{contactCopy(state)}</div>}
          </Stage>

          <Stage title="Outreach" active={state.status === "ready_for_outreach" || ["contacted", "replied", "interested", "call_scheduled", "proposal_sent", "won"].includes(state.status)}>
            <div><span className="text-zinc-500">Lifecycle:</span> <span className="capitalize">{label(state.status)}</span></div>
            <div>{state.status === "ready_for_outreach" ? "Ready for draft/approval." : state.status === "contacted" ? "Outreach sequence active." : ["replied", "interested", "call_scheduled", "proposal_sent", "won"].includes(state.status) ? "Prospect engagement is now driving the workflow." : "Outreach has not started."}</div>
          </Stage>
        </div>

        {state.contactState === "exhausted" && state.emailEnrichmentReason && <p className="mt-2 text-[11px] text-red-300/80">Contact reason: {state.emailEnrichmentReason}</p>}
        {error && <p className="mt-2 text-[11px] text-amber-300/70">Pipeline refresh warning: {error}</p>}
      </div>
    </div>
  );
}
