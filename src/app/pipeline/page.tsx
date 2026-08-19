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

type ResearchQueueBreakdown = {
  acquisitionIntent: number;
  performanceSignal: number;
  screeningCompleteness: number;
  listingIdentity: number;
  aging: number;
  ageDays: number;
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
  researchQueueBreakdown: ResearchQueueBreakdown;
};

type ResearchQueueResponse = {
  candidates: ResearchCandidate[];
  totalEligible: number;
  returned: number;
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

function sourceLabel(value: string) {
  return value === "paid_ad" ? "Paid ad" : "Organic";
}

function performanceClass(value: string) {
  if (value === "strong") return "border-red-800 bg-red-950/35 text-red-300";
  if (value === "moderate") return "border-amber-800 bg-amber-950/35 text-amber-300";
  if (value === "none") return "border-emerald-900 bg-emerald-950/30 text-emerald-300";
  return "border-zinc-700 bg-zinc-800 text-zinc-300";
}

function screeningClass(value: string) {
  if (value === "complete") return "border-emerald-900 bg-emerald-950/30 text-emerald-300";
  if (value === "partial") return "border-amber-800 bg-amber-950/35 text-amber-300";
  if (value === "failed") return "border-red-900 bg-red-950/30 text-red-300";
  return "border-zinc-700 bg-zinc-800 text-zinc-300";
}

function StatCard({ label: cardLabel, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{cardLabel}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs leading-5 text-zinc-500">{detail}</div>
    </div>
  );
}

export default function PipelinePage() {
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [queue, setQueue] = useState<ResearchQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const [summaryRes, queueRes] = await Promise.all([
        fetch("/api/pipeline/summary", { cache: "no-store" }),
        fetch("/api/pipeline/research-queue?limit=100", { cache: "no-store" }),
      ]);
      const summaryBody = await summaryRes.json();
      const queueBody = await queueRes.json();
      if (!summaryRes.ok) throw new Error(summaryBody.error ?? "Failed to load pipeline summary");
      if (!queueRes.ok) throw new Error(queueBody.error ?? "Failed to load research queue");
      setSummary(summaryBody as PipelineSummary);
      setQueue(queueBody as ResearchQueueResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <main className="min-h-screen bg-zinc-950 p-8 text-zinc-300">Loading candidate pipeline…</main>;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Candidate pipeline</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">
              Discovery and website research are intentionally separate from contact discovery. Candidates can enter AI research without an email; contact lookup begins only after a rebuild qualification.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <Link href="/automation" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm transition-colors hover:bg-zinc-700">Automation</Link>
          </div>
        </div>

        {error && <div className="mb-6 rounded border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>}

        {summary && (
          <>
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Current flow</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Research queue" value={summary.researchQueue} detail="Screened, unresearched candidates. Email is not required." />
                <StatCard label="Waiting for contact" value={summary.waitingForContact} detail="Qualified rebuild candidates that still need a usable email." />
                <StatCard label="Contact work due" value={summary.contactEnrichmentDue} detail="Qualified candidates whose contact lookup can run now." />
                <StatCard label="Contact exhausted" value={summary.contactExhausted} detail="Qualified candidates where automated email discovery is exhausted." />
              </div>
            </section>

            <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Screening pending" value={summary.screeningPending} detail="Discovered candidates not yet through site screening." />
              <StatCard label="Screening partial" value={summary.screeningPartial} detail="Candidates retained despite incomplete PageSpeed screening." />
              <StatCard label="Strong performance signal" value={summary.performanceStrong} detail="Performance is a strong research signal, never an admission gate." />
              <StatCard label="Moderate performance signal" value={summary.performanceModerate} detail="At least one performance threshold was crossed." />
            </section>
          </>
        )}

        <section className="rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div>
              <h2 className="font-semibold">Ranked AI research queue</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Backend-ranked by acquisition intent, performance signal, screening completeness, listing identity, and capped age. Contactability is not part of this score.
              </p>
            </div>
            <div className="text-sm text-zinc-400">
              {queue ? `${queue.totalEligible} eligible · showing ${queue.returned}` : "—"}
            </div>
          </div>

          {!queue?.candidates.length ? (
            <div className="px-5 py-10 text-center text-sm text-zinc-500">No candidates are waiting for AI research.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="text-left text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Performance</th>
                    <th className="px-4 py-3">Screening</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Score detail</th>
                    <th className="px-4 py-3">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {queue.candidates.map((candidate, index) => (
                    <tr key={candidate.id} className="align-top hover:bg-zinc-800/35">
                      <td className="px-4 py-4 font-mono text-zinc-500">{index + 1}</td>
                      <td className="px-4 py-4">
                        <Link href={`/leads/${candidate.id}`} className="font-medium text-white hover:text-indigo-300">
                          {candidate.businessName || candidate.domain}
                        </Link>
                        <div className="mt-1 text-xs text-zinc-500">{candidate.domain}</div>
                        <div className="mt-1 text-xs text-zinc-600">{candidate.keyword}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded border px-2 py-1 text-xs ${candidate.adSource === "paid_ad" ? "border-amber-800 bg-amber-950/35 text-amber-300" : "border-zinc-700 bg-zinc-800 text-zinc-300"}`}>
                          {sourceLabel(candidate.adSource)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded border px-2 py-1 text-xs capitalize ${performanceClass(candidate.performanceOpportunity)}`}>
                          {label(candidate.performanceOpportunity)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded border px-2 py-1 text-xs capitalize ${screeningClass(candidate.screeningStatus)}`}>
                          {label(candidate.screeningStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-lg font-semibold text-white">{candidate.researchQueueScore}</td>
                      <td className="px-4 py-4 text-xs leading-5 text-zinc-400">
                        <div>Intent {candidate.researchQueueBreakdown.acquisitionIntent} · Performance {candidate.researchQueueBreakdown.performanceSignal}</div>
                        <div>Screen {candidate.researchQueueBreakdown.screeningCompleteness} · Identity {candidate.researchQueueBreakdown.listingIdentity}</div>
                        <div>Age {candidate.researchQueueBreakdown.aging} ({candidate.researchQueueBreakdown.ageDays}d)</div>
                      </td>
                      <td className="px-4 py-4 text-xs text-zinc-500">
                        <div>{candidate.phone ? "Phone known" : "Phone not known"}</div>
                        <div className="mt-1">Email not required for research</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
