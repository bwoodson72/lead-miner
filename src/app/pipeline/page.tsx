"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PipelineSummary = {
  researchQueue: number;
  waitingForContact: number;
  contactEnrichmentDue: number;
  contactExhausted: number;
  screeningPending: number;
  screeningPartial: number;
  performanceStrong: number;
  performanceModerate: number;
};

type ResearchBreakdown = {
  acquisitionIntent: number;
  performance: number;
  screening: number;
  listingIdentity: number;
  age: number;
  total: number;
};

type ResearchCandidate = {
  id: number;
  businessName: string | null;
  domain: string;
  keyword: string;
  adSource: string;
  performanceOpportunity: string;
  screeningStatus: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
  researchQueueScore: number;
  researchQueueBreakdown: ResearchBreakdown;
};

type ResearchQueueResponse = {
  candidates: ResearchCandidate[];
  totalEligible: number;
  returned: number;
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

function ageDays(createdAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
}

function Spinner() {
  return <span aria-hidden="true" className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />;
}

export default function PipelinePage() {
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [queue, setQueue] = useState<ResearchQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [researchingId, setResearchingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, queueRes] = await Promise.all([
        fetch("/api/pipeline/summary", { cache: "no-store" }),
        fetch("/api/pipeline/research-queue?limit=100", { cache: "no-store" }),
      ]);
      const summaryBody = await summaryRes.json().catch(() => ({}));
      const queueBody = await queueRes.json().catch(() => ({}));
      if (!summaryRes.ok) throw new Error(summaryBody.error ?? "Pipeline summary failed");
      if (!queueRes.ok) throw new Error(queueBody.error ?? "Research queue failed");
      setSummary(summaryBody);
      setQueue(queueBody);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function research(candidate: ResearchCandidate) {
    if (researchingId !== null) return;
    setResearchingId(candidate.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/leads/${candidate.id}/research`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `Research failed (${response.status})`);
      setNotice(`Research completed for ${candidate.businessName || candidate.domain}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResearchingId(null);
    }
  }

  const cards: Array<[string, number | undefined, string]> = [
    ["Research queue", summary?.researchQueue, "Screened candidates waiting for website research"],
    ["Waiting for contact", summary?.waitingForContact, "Qualified rebuilds that still need an email"],
    ["Contact due", summary?.contactEnrichmentDue, "Qualified rebuilds eligible for contact enrichment now"],
    ["Contact exhausted", summary?.contactExhausted, "Qualified rebuilds where contact discovery is exhausted"],
    ["Screening pending", summary?.screeningPending, "Candidates persisted but not yet screened"],
    ["Screening partial", summary?.screeningPartial, "Candidates retained with incomplete screening data"],
    ["Strong performance", summary?.performanceStrong, "Candidates with a strong performance signal"],
    ["Moderate performance", summary?.performanceModerate, "Candidates with a moderate performance signal"],
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-8">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Candidate Pipeline</h1>
            <p className="mt-1 max-w-3xl text-sm text-zinc-400">
              Discovery and website research are contact-neutral. Email availability is not used to decide who gets researched; contact discovery begins only after a lead qualifies as a rebuild candidate.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading || researchingId !== null}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm transition-colors hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {notice && <div aria-live="polite" className="mb-5 rounded border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
        {error && <div aria-live="assertive" className="mb-5 rounded border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>}

        <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([name, value, detail]) => (
            <div key={name} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-2xl font-semibold">{value ?? "—"}</div>
              <div className="mt-1 text-sm font-medium text-zinc-200">{name}</div>
              <div className="mt-1 text-xs text-zinc-500">{detail}</div>
            </div>
          ))}
        </div>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div>
              <h2 className="font-semibold">Ranked research queue</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Backend-ranked by acquisition intent, performance signal, screening completeness, listing identity, and capped aging. Email contributes zero points.
              </p>
            </div>
            <div className="text-xs text-zinc-500">
              {queue ? `${queue.returned} shown · ${queue.totalEligible} eligible` : "Loading queue…"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Performance</th>
                  <th className="px-4 py-3">Screening</th>
                  <th className="px-4 py-3">Listing evidence</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {loading && !queue ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-zinc-500">Loading candidate pipeline…</td></tr>
                ) : queue?.candidates.length ? queue.candidates.map((candidate, index) => {
                  const breakdown = candidate.researchQueueBreakdown;
                  const evidence = [candidate.businessName ? "name" : null, candidate.phone ? "phone" : null, candidate.address ? "address" : null].filter(Boolean).join(" · ") || "none";
                  const busy = researchingId === candidate.id;
                  return (
                    <tr key={candidate.id} className="hover:bg-zinc-800/45">
                      <td className="px-4 py-3 text-zinc-500">#{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{candidate.businessName || candidate.domain}</div>
                        <div className="mt-0.5 text-xs text-zinc-500">{candidate.domain} · {candidate.keyword}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-lg font-semibold">{candidate.researchQueueScore}</div>
                        <div className="whitespace-nowrap text-[11px] text-zinc-500">
                          acq {breakdown.acquisitionIntent} · perf {breakdown.performance} · screen {breakdown.screening} · identity {breakdown.listingIdentity} · age {breakdown.age}
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize">{candidate.adSource === "paid_ad" ? "Paid ad" : "Organic"}</td>
                      <td className="px-4 py-3 capitalize">{label(candidate.performanceOpportunity)}</td>
                      <td className="px-4 py-3 capitalize">{label(candidate.screeningStatus)}</td>
                      <td className="px-4 py-3 text-zinc-400">{evidence}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{ageDays(candidate.createdAt)}d</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => void research(candidate)}
                            disabled={researchingId !== null}
                            className="inline-flex items-center gap-1.5 rounded bg-indigo-700 px-2.5 py-1.5 text-xs font-medium hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-45"
                          >
                            {busy ? <><Spinner />Researching…</> : "Research now"}
                          </button>
                          <Link href={`/leads/${candidate.id}`} className="rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs hover:bg-zinc-700">View lead</Link>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-zinc-500">No candidates are waiting for research.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
