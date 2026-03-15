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
    setLeads(data.leads);
    setKeywords(data.keywords);
    setDiagnostics(data.diagnostics);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white">Lead Miner</h1>
          <p className="mt-1.5 text-zinc-400">
            Find businesses running ads on slow websites
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 mb-8">
          <KeywordForm onResults={handleResults} />
        </div>

        {/* Results */}
        {leads !== null && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Found{" "}
              <span className="font-semibold text-white">{leads.length}</span>{" "}
              lead{leads.length !== 1 ? "s" : ""} from{" "}
              <span className="font-semibold text-white">{keywords.length}</span>{" "}
              keyword{keywords.length !== 1 ? "s" : ""}
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
