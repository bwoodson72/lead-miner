"use client";

import { useState } from "react";
import KeywordForm from "@/components/keyword-form";
import ResultsTable from "@/components/results-table";
import type { LeadRecord } from "@/lib/schemas";

export default function Home() {
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

  const paidAdsFound = diagnostics && typeof diagnostics.paidAdsFound === "number"
    ? diagnostics.paidAdsFound
    : null;
  const organicFound = diagnostics && typeof diagnostics.organicBusinessesFound === "number"
    ? diagnostics.organicBusinessesFound
    : null;
  const paidLeads = leads?.filter((lead) => lead.adSource === "paid_ad").length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white">Lead Miner</h1>
          <p className="mt-1.5 text-zinc-400">
            Find businesses running ads on slow websites
          </p>
        </div>

        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 mb-8">
          <KeywordForm onResults={handleResults} />
        </div>

        {leads !== null && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3">
                <div className="text-xl font-bold text-white">{leads.length}</div>
                <div className="text-xs text-zinc-500">Slow leads returned</div>
              </div>
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3">
                <div className="text-xl font-bold text-amber-400">{paidAdsFound ?? "—"}</div>
                <div className="text-xs text-zinc-500">Paid ads discovered</div>
              </div>
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3">
                <div className="text-xl font-bold text-amber-300">{paidLeads}</div>
                <div className="text-xs text-zinc-500">Slow paid-ad leads</div>
              </div>
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3">
                <div className="text-xl font-bold text-emerald-400">{organicFound ?? "—"}</div>
                <div className="text-xs text-zinc-500">Organic businesses discovered</div>
              </div>
            </div>

            <p className="text-sm text-zinc-400">
              Searched <span className="font-semibold text-white">{keywords.length}</span>{" "}
              keyword{keywords.length !== 1 ? "s" : ""}
              {diagnostics && typeof diagnostics.franchisesFiltered === "number" && diagnostics.franchisesFiltered > 0 && (
                <span>
                  {" "}· <span className="font-semibold text-zinc-300">{String(diagnostics.franchisesFiltered)}</span> franchise{diagnostics.franchisesFiltered !== 1 ? "s" : ""} filtered
                </span>
              )}
            </p>

            {diagnostics !== null && (
              <details className="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium text-zinc-400 select-none">
                  Pipeline Diagnostics
                </summary>
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
