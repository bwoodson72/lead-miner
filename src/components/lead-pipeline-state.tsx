"use client";

import { useEffect, useState } from "react";

type PipelineState = {
  leadId: number;
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
  contactState: "not_required" | "waiting" | "retry_scheduled" | "exhausted" | "ready";
  emailEnrichmentStatus: string;
  emailEnrichmentReason: string | null;
  nextEmailEnrichmentAt: string | null;
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

function contactCopy(state: PipelineState) {
  switch (state.contactState) {
    case "not_required":
      return "Contact lookup is not required yet. Website research and qualification come first.";
    case "waiting":
      return "Rebuild qualified. Waiting for a usable email before outreach preparation.";
    case "retry_scheduled":
      return `Rebuild qualified. Contact lookup will retry${state.nextEmailEnrichmentAt ? ` ${new Date(state.nextEmailEnrichmentAt).toLocaleString()}` : " later"}.`;
    case "exhausted":
      return "Rebuild qualified, but automated email discovery is exhausted. Manual contact review is needed.";
    case "ready":
      return "Contact ready. This lead can continue into priority and outreach preparation.";
  }
}

function contactClass(state: PipelineState["contactState"]) {
  if (state === "ready") return "border-emerald-900 bg-emerald-950/30 text-emerald-200";
  if (state === "exhausted") return "border-red-900 bg-red-950/30 text-red-200";
  if (state === "waiting" || state === "retry_scheduled") return "border-amber-900 bg-amber-950/25 text-amber-200";
  return "border-zinc-800 bg-zinc-900 text-zinc-300";
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
        if (!cancelled) {
          setState(body as PipelineState);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 10_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [leadId]);

  if (error && !state) {
    return (
      <div className="border-b border-red-950 bg-red-950/20">
        <div className="mx-auto max-w-7xl px-4 py-2 text-xs text-red-300">Pipeline state unavailable: {error}</div>
      </div>
    );
  }
  if (!state) return null;

  return (
    <div className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <div>
            <span className="text-zinc-500">Screening </span>
            <span className="font-medium capitalize text-zinc-200">{label(state.screeningStatus)}</span>
          </div>
          <div>
            <span className="text-zinc-500">Performance </span>
            <span className="font-medium capitalize text-zinc-200">{label(state.performanceOpportunity)}</span>
          </div>
          <div>
            <span className="text-zinc-500">Research </span>
            <span className={state.researchEligible ? "font-medium text-indigo-300" : "font-medium text-zinc-300"}>
              {state.researchEligible ? `Queued · score ${state.researchQueueScore ?? "—"}` : "Not queued"}
            </span>
          </div>
          <div className={`rounded border px-2 py-1 ${contactClass(state.contactState)}`}>
            <span className="font-semibold capitalize">Contact: {label(state.contactState)}</span>
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-zinc-500">{contactCopy(state)}</p>
        {state.researchEligible && state.researchQueueBreakdown && (
          <p className="mt-1 text-[11px] text-zinc-600">
            Research score: intent {state.researchQueueBreakdown.acquisitionIntent} · performance {state.researchQueueBreakdown.performanceSignal} · screening {state.researchQueueBreakdown.screeningCompleteness} · listing identity {state.researchQueueBreakdown.listingIdentity} · age {state.researchQueueBreakdown.aging}.
          </p>
        )}
        {state.contactState === "exhausted" && state.emailEnrichmentReason && (
          <p className="mt-1 text-[11px] text-red-300/80">Contact reason: {state.emailEnrichmentReason}</p>
        )}
        {error && <p className="mt-1 text-[11px] text-amber-300/70">Pipeline refresh warning: {error}</p>}
      </div>
    </div>
  );
}
