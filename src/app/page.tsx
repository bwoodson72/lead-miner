"use client";

import { useState } from "react";
import KeywordForm from "@/components/keyword-form";
import ImportWebsites from "@/components/import-websites";
import ResultsTable from "@/components/results-table";
import type { LeadRecord } from "@/lib/schemas";

function diagnosticNumber(diagnostics: Record<string, unknown> | null, key: string) {
  return diagnostics && typeof diagnostics[key] === "number" ? diagnostics[key] as number : null;
}

export default function Home() {
  const [mode, setMode] = useState<"search" | "import">("search");
  const [leads, setLeads] = useState<LeadRecord[] | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown> | null>(null);

  function handleResults(data: {
    leads: LeadRecord[];
    keywords: string[];
    diagnostics: Record<string, unknown>;
  }) {
    setLeads(data.leads ?? []);
    setKeywords(data.keywords ?? []);
    setDiagnostics(data.diagnostics ?? null);
  }

  const businessesDiscovered = diagnosticNumber(diagnostics, "adsFound");
  const paidAdsFound = diagnosticNumber(diagnostics, "paidAdsFound");
  const organicFound = diagnosticNumber(diagnostics, "organicBusinessesFound");
  const domainsAnalyzed = diagnosticNumber(diagnostics, "pageSpeedResults");
  const candidatesSaved = diagnosticNumber(diagnostics, "candidatesSaved") ?? leads?.length ?? null;
  const strongPerformanceSignals = diagnosticNumber(diagnostics, "performanceStrong") ?? leads?.filter((lead) => lead.performanceOpportunity === "strong").length ?? null;
  const moderatePerformanceSignals = diagnosticNumber(diagnostics, "performanceModerate") ?? leads?.filter((lead) => lead.performanceOpportunity === "moderate").length ?? null;
  const performanceIssues = strongPerformanceSignals == null || moderatePerformanceSignals == null ? null : strongPerformanceSignals + moderatePerformanceSignals;
  const pageSpeedFailures = diagnosticNumber(diagnostics, "pageSpeedFailures") ?? 0;
  const researchQueued = diagnosticNumber(diagnostics, "researchQueued");
  const contactDeferred = diagnosticNumber(diagnostics, "contactEnrichmentDeferred");
  const paidCandidates = leads?.filter((lead) => lead.adSource === "paid_ad").length ?? 0;

  const cards: Array<[string, number | null, string]> = [
    ["Businesses discovered", businessesDiscovered, "Raw paid + local organic results before domain deduplication"],
    ["Candidates saved", candidatesSaved, "Legitimate deduplicated non-franchise businesses persisted"],
    ["Paid advertisers", paidCandidates || paidAdsFound, "Candidates with paid acquisition intent"],
    ["PageSpeed analyzed", domainsAnalyzed, "Candidates with usable performance screening data"],
    ["Performance issues", performanceIssues, "Strong + moderate performance signals; never an admission gate"],
    ["PageSpeed unavailable", pageSpeedFailures, "Candidates retained with unknown performance"],
    ["Research queued", researchQueued, "Candidates handed off to AI website research"],
    ["Contact enrichment deferred", contactDeferred, "Contact lookup waits until rebuild qualification"],
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Lead Miner</h1>
          <p className="mt-1.5 text-zinc-400">Discover or import service businesses and qualify their websites through one candidate pipeline.</p>
        </div>

        <div className="mb-4 flex gap-2 border-b border-zinc-800">
          <button onClick={() => setMode("search")} className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${mode === "search" ? "border-indigo-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>Search</button>
          <button onClick={() => setMode("import")} className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${mode === "import" ? "border-indigo-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>Import URLs</button>
        </div>

        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          {mode === "search" ? <KeywordForm onResults={handleResults} /> : <ImportWebsites />}
        </div>

        {mode === "search" && leads !== null && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map(([name, value, detail]) => (
                <div key={name} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <div className="text-xl font-bold text-white">{value ?? "—"}</div>
                  <div className="text-xs font-medium text-zinc-400">{name}</div>
                  <div className="mt-1 text-[11px] leading-4 text-zinc-600">{detail}</div>
                </div>
              ))}
            </div>

            <p className="text-sm text-zinc-400">
              Searched <span className="font-semibold text-white">{keywords.length}</span>{" "}
              keyword{keywords.length !== 1 ? "s" : ""}
              {organicFound !== null && <span> · <span className="font-semibold text-zinc-300">{organicFound}</span> organic businesses discovered</span>}
              {pageSpeedFailures > 0 && <span> · <span className="font-semibold text-zinc-300">{pageSpeedFailures}</span> candidate{pageSpeedFailures !== 1 ? "s" : ""} retained despite unavailable PageSpeed data</span>}
              {diagnostics && typeof diagnostics.franchisesFiltered === "number" && diagnostics.franchisesFiltered > 0 && <span> · <span className="font-semibold text-zinc-300">{String(diagnostics.franchisesFiltered)}</span> franchise{diagnostics.franchisesFiltered !== 1 ? "s" : ""} filtered</span>}
            </p>

            {diagnostics !== null && (
              <details className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
                <summary className="cursor-pointer select-none text-xs font-medium text-zinc-400">Pipeline Diagnostics</summary>
                <dl className="mt-2 space-y-1 font-mono text-xs text-zinc-400">
                  {Object.entries(diagnostics).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <dt className="text-zinc-500">{key}:</dt>
                      <dd className="text-zinc-300">{JSON.stringify(value)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}

            <ResultsTable leads={leads} />
          </div>
        )}
      </div>
    </div>
  );
}
