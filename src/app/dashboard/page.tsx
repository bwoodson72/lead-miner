"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProgressMeter from "@/components/progress-meter";
import { loadDashboardView, saveDashboardView } from "@/lib/dashboard-view-state";

export type Lead = {
  id: number;
  domain: string;
  businessName: string | null;
  landingPageUrl: string;
  keyword: string;
  adSource: string;
  lighthouseScore: number;
  lcp: number;
  cls: number | null;
  tbt: number | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactPageUrl: string | null;
  enrichmentStatus: string | null;
  status: string;
  outreachCount: number;
  firstContactAt: string | null;
  lastOutreachDate: string | null;
  notes: Array<{ text: string; date: string }>;
  isAgencyManaged: boolean;
  agencyName: string | null;
  isNationalChain: boolean;
  chainReason: string | null;
  followUpDate: string | null;
  qualificationDecision: string | null;
  qualificationReason: string | null;
  priorityScore: number | null;
  primaryOutreachAngle: string | null;
  researchSummary: string | null;
  researchVersion: string | null;
  lastResearchedAt: string | null;
  replyStatus: string | null;
  replySummary: string | null;
  lastReplyAt: string | null;
  createdAt: string;
  updatedAt: string;
  assetStrength?: string | null;
  assetAssessments?: Array<{
    assetStrength: string;
    decision: string;
    confidence: number;
    findings: Array<{
      id: number;
      title: string;
      category: string;
      confidence: number;
      significance: string;
    }>;
  }>;
  outreachMessages?: Array<{ kind: string; sequenceNumber: number; status: string }>;
};

type Operations = {
  researchQueue: number;
  qualified: number;
  readyToSend: number;
  followupsDue: number;
  followupsOverdue: number;
  replies: number;
  interested: number;
  meetings: number;
  wins: number;
  failedJobs: number;
  lastRun: { jobName: string; status: string; startedAt: string } | null;
  aiBudget: {
    dailySpent: number;
    dailyLimit: number;
    monthlySpent: number;
    monthlyLimit: number;
    reached: boolean;
  };
};

type Filters = {
  search: string;
  status: string;
  qualificationDecision: string;
  replyStatus: string;
  minPriority: string;
  hasEmail: string;
  ads: string;
  sortBy: string;
  sortDir: string;
  pageSize: number;
};

type BulkAction = "research" | "prepare_outreach" | "qualify" | "disqualify" | "hold" | "reject";

type BulkProgress = {
  detail: string;
  processed?: number;
  total?: number;
  succeeded?: number;
  failed?: number;
};

const BULK_RESEARCH_CONCURRENCY = 2;

const statuses = [
  "",
  "new",
  "research_pending",
  "researching",
  "qualified",
  "disqualified",
  "ready_for_outreach",
  "held",
  "contacted",
  "replied",
  "interested",
  "call_scheduled",
  "proposal_sent",
  "won",
  "lost",
  "rejected",
  "bounced",
  "unsubscribed",
  "closed_no_response",
];

const decisions = ["", "rebuild_candidate", "no_material_opportunity", "needs_review"];

const defaultFilters: Filters = {
  search: "",
  status: "",
  qualificationDecision: "",
  replyStatus: "",
  minPriority: "",
  hasEmail: "",
  ads: "",
  sortBy: "priorityScore",
  sortDir: "desc",
  pageSize: 50,
};

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "—";
}

function fmt(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function bulkActionLabel(action: BulkAction | null) {
  if (!action) return "Bulk action";
  return {
    research: "Research",
    prepare_outreach: "Prepare outreach",
    qualify: "Qualify rebuild",
    disqualify: "Disqualify",
    hold: "Hold",
    reject: "Reject",
  }[action];
}

function runningLabel(action: BulkAction) {
  return {
    research: "Researching…",
    prepare_outreach: "Preparing…",
    qualify: "Qualifying…",
    disqualify: "Disqualifying…",
    hold: "Holding…",
    reject: "Rejecting…",
  }[action];
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white"
    />
  );
}

async function requestLeadResearch(id: number) {
  const res = await fetch(`/api/leads/${id}/research`, { method: "POST" });
  const body = await res.json().catch(() => ({ error: `Research request failed with HTTP ${res.status}` }));
  if (!res.ok) throw new Error(body.error ?? "Research failed");
  return body;
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [operations, setOperations] = useState<Operations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [activeBulkAction, setActiveBulkAction] = useState<BulkAction | null>(null);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [viewRestored, setViewRestored] = useState(false);
  const [restoreScrollY, setRestoreScrollY] = useState<number | null>(null);

  useEffect(() => {
    const restored = loadDashboardView(defaultFilters);
    if (restored) {
      setFilters(restored.filters);
      setPage(restored.page);
      setRestoreScrollY(restored.scrollY);
    }
    setViewRestored(true);
  }, []);

  useEffect(() => {
    if (!viewRestored) return;
    saveDashboardView(filters, page);
  }, [filters, page, viewRestored]);

  useEffect(() => {
    if (!viewRestored) return;
    const remember = () => saveDashboardView(filters, page, window.scrollY);
    window.addEventListener("pagehide", remember);
    return () => window.removeEventListener("pagehide", remember);
  }, [filters, page, viewRestored]);

  const query = useMemo(() => {
    const p = new URLSearchParams({
      page: String(page),
      pageSize: String(filters.pageSize),
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
    });
    if (filters.search) p.set("search", filters.search);
    if (filters.status) p.set("status", filters.status);
    if (filters.qualificationDecision) p.set("qualificationDecision", filters.qualificationDecision);
    if (filters.replyStatus) p.set("replyStatus", filters.replyStatus);
    if (filters.minPriority) p.set("minPriority", filters.minPriority);
    if (filters.hasEmail) p.set("hasEmail", filters.hasEmail);
    if (filters.ads === "paid") p.set("ads", "true");
    return p.toString();
  }, [filters, page]);

  useEffect(() => {
    if (!viewRestored) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [leadsRes, opsRes] = await Promise.all([
          fetch(`/api/leads/query?${query}`, { cache: "no-store" }),
          fetch("/api/dashboard/operations", { cache: "no-store" }),
        ]);
        const [leadData, opsData] = await Promise.all([leadsRes.json(), opsRes.json()]);
        if (!leadsRes.ok) throw new Error(leadData.error ?? "Lead query failed");
        if (!opsRes.ok) throw new Error(opsData.error ?? "Dashboard summary failed");
        if (!cancelled) {
          const nextTotalPages = leadData.totalPages ?? 1;
          if (page > nextTotalPages) {
            setPage(Math.max(1, nextTotalPages));
            return;
          }
          setLeads(leadData.leads ?? []);
          setTotal(leadData.total ?? 0);
          setTotalPages(nextTotalPages);
          setOperations(opsData);
          setSelected(new Set());
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewRestored, query, refreshKey, page]);

  useEffect(() => {
    if (!viewRestored || loading || restoreScrollY === null) return;
    const target = restoreScrollY;
    setRestoreScrollY(null);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.scrollTo({ top: target, behavior: "auto" }));
    });
  }, [viewRestored, loading, restoreScrollY]);

  function change<K extends keyof Filters>(key: K, value: Filters[K]) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function rememberViewPosition() {
    saveDashboardView(filters, page, window.scrollY);
  }

  function toggle(id: number) {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectPage() {
    setSelected(selected.size === leads.length ? new Set() : new Set(leads.map((l) => l.id)));
  }

  function startBulk(action: BulkAction, detail: string) {
    setBusy(true);
    setActiveBulkAction(action);
    setBulkProgress({ detail });
    setError(null);
    setNotice(null);
  }

  function finishBulk() {
    setBusy(false);
    setActiveBulkAction(null);
    window.setTimeout(() => setBulkProgress(null), 1600);
  }

  async function bulk(action: Exclude<BulkAction, "research">, extra: Record<string, unknown> = {}) {
    if (!selected.size || busy) return;
    const ids = Array.from(selected);
    const actionName = bulkActionLabel(action);
    startBulk(action, `${actionName} is running on ${ids.length} ${ids.length === 1 ? "lead" : "leads"}…`);
    try {
      const res = await fetch("/api/leads/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action, ...extra }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Bulk action failed");

      const processed = Number(body.processed ?? ids.length);
      const succeeded = Number(body.succeeded ?? 0);
      const failed = Number(body.failed ?? 0);
      const failures = Array.isArray(body.results)
        ? body.results
            .filter((result: { success?: boolean }) => !result.success)
            .map((result: { id?: number; error?: string }) => `#${result.id ?? "?"}: ${result.error ?? "Unknown error"}`)
        : [];

      setBulkProgress({
        detail: `${processed} of ${ids.length} leads processed`,
        processed,
        total: ids.length,
        succeeded,
        failed,
      });

      if (succeeded > 0) {
        setNotice(`${actionName} applied to ${succeeded} ${succeeded === 1 ? "lead" : "leads"}.`);
        setRefreshKey((k) => k + 1);
      }
      if (failed > 0) {
        setError(`${succeeded} succeeded; ${failed} failed.${failures.length ? ` ${failures.slice(0, 3).join(" · ")}` : ""}`);
      }
      if (succeeded === 0 && failed > 0) {
        throw new Error(
          `${actionName} failed for all ${failed} selected ${failed === 1 ? "lead" : "leads"}.${failures.length ? ` ${failures.slice(0, 3).join(" · ")}` : ""}`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      finishBulk();
    }
  }

  async function researchSelected() {
    if (!selected.size || busy) return;
    const ids = Array.from(selected);
    startBulk("research", `Research is starting for ${ids.length} ${ids.length === 1 ? "lead" : "leads"}…`);

    let nextIndex = 0;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const failures: string[] = [];

    const worker = async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= ids.length) return;
        const id = ids[index]!;
        const lead = leads.find((item) => item.id === id);
        const leadName = lead?.businessName || lead?.domain || `lead #${id}`;

        setBulkProgress({
          detail: `Researching ${leadName}…`,
          processed,
          total: ids.length,
          succeeded,
          failed,
        });

        try {
          await requestLeadResearch(id);
          succeeded++;
        } catch (e) {
          failed++;
          failures.push(`#${id}: ${e instanceof Error ? e.message : String(e)}`);
        }

        processed++;
        setBulkProgress({
          detail: `${processed} of ${ids.length} leads researched`,
          processed,
          total: ids.length,
          succeeded,
          failed,
        });
      }
    };

    try {
      const workerCount = Math.min(BULK_RESEARCH_CONCURRENCY, ids.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));

      if (succeeded > 0) {
        setNotice(`Research completed for ${succeeded} ${succeeded === 1 ? "lead" : "leads"}.`);
        setRefreshKey((k) => k + 1);
      }
      if (failed > 0) {
        setError(`${succeeded} researched; ${failed} failed.${failures.length ? ` ${failures.slice(0, 3).join(" · ")}` : ""}`);
      }
    } finally {
      finishBulk();
    }
  }

  async function researchOne(id: number) {
    setBusy(true);
    setError(null);
    try {
      await requestLeadResearch(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function prepareOne(id: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/leads/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], action: "prepare_outreach" }),
      });
      const body = await res.json();
      if (!res.ok || body.failed) {
        throw new Error(body.results?.[0]?.error ?? body.error ?? "Outreach preparation failed");
      }
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const cards = operations
    ? [
        ["Research queue", operations.researchQueue],
        ["Qualified", operations.qualified],
        ["Ready to send", operations.readyToSend],
        ["Follow-ups due", operations.followupsDue],
        ["Overdue", operations.followupsOverdue],
        ["Replies", operations.replies],
        ["Interested", operations.interested],
        ["Meetings", operations.meetings],
        ["Won", operations.wins],
      ]
    : [];

  const bulkButtonBase =
    "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 active:translate-y-0 disabled:cursor-wait disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none";

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-8">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Lead Miner</h1>
            <p className="mt-1 text-sm text-zinc-400">Operational pipeline and prioritized prospect queue.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/outreach" className="rounded bg-indigo-700 px-3 py-2 text-sm">Outreach</Link>
            <Link href="/inbox" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Inbox</Link>
            <Link href="/automation" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Automation</Link>
            <Link href="/analytics" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Analytics</Link>
            <Link href="/settings" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Settings</Link>
            <Link href="/" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">New search</Link>
          </div>
        </div>

        {notice && (
          <div aria-live="polite" className="mb-4 rounded border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}
        {error && (
          <div aria-live="assertive" className="mb-4 rounded border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5 lg:grid-cols-9">
          {cards.map(([name, value]) => (
            <div key={String(name)} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <div className="text-xl font-semibold">{value}</div>
              <div className="text-xs text-zinc-500">{name}</div>
            </div>
          ))}
        </div>

        {operations && (
          <div className="mb-5 flex flex-wrap gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-400">
            <span>AI today ${operations.aiBudget.dailySpent.toFixed(4)} / ${operations.aiBudget.dailyLimit.toFixed(2)}</span>
            <span>Month ${operations.aiBudget.monthlySpent.toFixed(4)} / ${operations.aiBudget.monthlyLimit.toFixed(2)}</span>
            <span>Failed AI jobs {operations.failedJobs}</span>
            <span>Last automation: {operations.lastRun ? `${label(operations.lastRun.jobName)} · ${label(operations.lastRun.status)}` : "never"}</span>
            {operations.aiBudget.reached && <span className="text-amber-300">AI budget reached</span>}
          </div>
        )}

        <section className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <input placeholder="Business, domain, keyword" value={filters.search} onChange={(e) => change("search", e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
            <select value={filters.status} onChange={(e) => change("status", e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
              {statuses.map((v) => <option key={v} value={v}>{v ? label(v) : "All statuses"}</option>)}
            </select>
            <select value={filters.qualificationDecision} onChange={(e) => change("qualificationDecision", e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
              {decisions.map((v) => <option key={v} value={v}>{v ? label(v) : "All decisions"}</option>)}
            </select>
            <select value={filters.replyStatus} onChange={(e) => change("replyStatus", e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
              <option value="">All reply states</option>
              {["interested", "question", "objection", "not_now", "not_interested", "wrong_person", "referral", "out_of_office", "bounce", "unsubscribe", "booking_intent", "other"].map((v) => <option key={v}>{v}</option>)}
            </select>
            <input type="number" min={0} max={100} placeholder="Min priority" value={filters.minPriority} onChange={(e) => change("minPriority", e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
            <select value={filters.hasEmail} onChange={(e) => change("hasEmail", e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
              <option value="">Any contactability</option><option value="true">Has email</option><option value="false">No email</option>
            </select>
            <select value={filters.ads} onChange={(e) => change("ads", e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
              <option value="">Any acquisition source</option><option value="paid">Paid ads</option>
            </select>
            <select value={filters.sortBy} onChange={(e) => change("sortBy", e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
              {[["priorityScore", "Priority"], ["createdAt", "Created"], ["lcp", "LCP"], ["followUpDate", "Next follow-up"], ["lastOutreachDate", "Last outreach"], ["lastReplyAt", "Last reply"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filters.sortDir} onChange={(e) => change("sortDir", e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
              <option value="desc">Descending</option><option value="asc">Ascending</option>
            </select>
          </div>
        </section>

        {selected.size > 0 && (
          <div
            aria-live="polite"
            aria-busy={busy}
            className={`sticky top-3 z-30 mb-4 rounded-xl border px-4 py-3 shadow-xl backdrop-blur transition-all ${busy ? "border-indigo-400 bg-indigo-950/95 ring-2 ring-indigo-500/30" : "border-indigo-800 bg-indigo-950/75"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-sm font-medium">{selected.size} selected</span>
              {busy && activeBulkAction && (
                <span className="mr-2 inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100">
                  <Spinner /> Running {bulkActionLabel(activeBulkAction)}…
                </span>
              )}

              <button disabled={busy} onClick={researchSelected} className={`${bulkButtonBase} bg-indigo-700 hover:bg-indigo-600 hover:shadow-indigo-950/40 focus-visible:ring-indigo-300 ${busy && activeBulkAction === "research" ? "ring-2 ring-white/40" : ""}`}>
                {busy && activeBulkAction === "research" ? <><Spinner />{runningLabel("research")}</> : "Research"}
              </button>
              <button disabled={busy} onClick={() => bulk("prepare_outreach")} className={`${bulkButtonBase} bg-emerald-700 hover:bg-emerald-600 hover:shadow-emerald-950/40 focus-visible:ring-emerald-300 ${busy && activeBulkAction === "prepare_outreach" ? "ring-2 ring-white/40" : ""}`}>
                {busy && activeBulkAction === "prepare_outreach" ? <><Spinner />{runningLabel("prepare_outreach")}</> : "Prepare outreach"}
              </button>
              <button disabled={busy} onClick={() => bulk("qualify", { qualificationDecision: "rebuild_candidate" })} className={`${bulkButtonBase} bg-sky-700 hover:bg-sky-600 hover:shadow-sky-950/40 focus-visible:ring-sky-300 ${busy && activeBulkAction === "qualify" ? "ring-2 ring-white/40" : ""}`}>
                {busy && activeBulkAction === "qualify" ? <><Spinner />{runningLabel("qualify")}</> : "Qualify rebuild"}
              </button>
              <button disabled={busy} onClick={() => bulk("disqualify")} className={`${bulkButtonBase} bg-zinc-700 hover:bg-zinc-600 hover:shadow-black/30 focus-visible:ring-zinc-300 ${busy && activeBulkAction === "disqualify" ? "ring-2 ring-white/40" : ""}`}>
                {busy && activeBulkAction === "disqualify" ? <><Spinner />{runningLabel("disqualify")}</> : "Disqualify"}
              </button>
              <button disabled={busy} onClick={() => bulk("hold")} className={`${bulkButtonBase} bg-amber-800 hover:bg-amber-700 hover:shadow-amber-950/40 focus-visible:ring-amber-300 ${busy && activeBulkAction === "hold" ? "ring-2 ring-white/40" : ""}`}>
                {busy && activeBulkAction === "hold" ? <><Spinner />{runningLabel("hold")}</> : "Hold"}
              </button>
              <button disabled={busy} onClick={() => bulk("reject")} className={`${bulkButtonBase} bg-red-800 hover:bg-red-700 hover:shadow-red-950/40 focus-visible:ring-red-300 ${busy && activeBulkAction === "reject" ? "ring-2 ring-white/40" : ""}`}>
                {busy && activeBulkAction === "reject" ? <><Spinner />{runningLabel("reject")}</> : "Reject"}
              </button>
            </div>

            {bulkProgress && (
              <div className="pt-3">
                <ProgressMeter
                  label={busy && activeBulkAction ? `${bulkActionLabel(activeBulkAction)} in progress` : "Bulk lead action"}
                  detail={bulkProgress.detail}
                  processed={bulkProgress.processed}
                  total={bulkProgress.total}
                  succeeded={bulkProgress.succeeded}
                  failed={bulkProgress.failed}
                />
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-3"><input type="checkbox" checked={leads.length > 0 && selected.size === leads.length} onChange={selectPage} /></th>
                <th className="px-3 py-3">Business</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Opportunity</th><th className="px-3 py-3">Asset</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Contact</th><th className="px-3 py-3">Sequence / reply</th><th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {loading ? (
                <tr><td colSpan={9} className="p-10 text-center text-zinc-500">Loading…</td></tr>
              ) : leads.map((lead) => {
                const assessment = lead.assetAssessments?.[0];
                const lastMessage = lead.outreachMessages?.[0];
                return (
                  <tr key={lead.id} className="hover:bg-zinc-900/60">
                    <td className="px-3 py-3"><input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggle(lead.id)} /></td>
                    <td className="px-3 py-3"><div className="font-medium text-white">{lead.businessName || lead.domain}</div><div className="text-xs text-zinc-500">{lead.domain} · {lead.keyword}</div></td>
                    <td className="px-3 py-3 text-lg font-semibold">{lead.priorityScore ?? "—"}</td>
                    <td className="px-3 py-3"><div className="capitalize">{label(lead.qualificationDecision)}</div><div className="text-xs text-zinc-500">{lead.lastResearchedAt ? `researched ${fmt(lead.lastResearchedAt)}` : "not researched"}</div></td>
                    <td className="px-3 py-3 capitalize">{assessment?.assetStrength ?? lead.assetStrength ?? "—"}</td>
                    <td className="px-3 py-3 capitalize">{label(lead.status)}</td>
                    <td className="px-3 py-3"><div>{lead.email ?? "No email"}</div><div className="text-xs text-zinc-500">{lead.phone ?? "No phone"}</div></td>
                    <td className="px-3 py-3"><div>{lastMessage ? `${lastMessage.kind} #${lastMessage.sequenceNumber} · ${lastMessage.status}` : "No outreach"}</div><div className="text-xs text-zinc-500">{lead.replyStatus ? `Reply: ${label(lead.replyStatus)}` : lead.followUpDate ? `Next ${fmt(lead.followUpDate)}` : "—"}</div></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Link href={`/leads/${lead.id}`} onClick={rememberViewPosition} className="rounded bg-zinc-700 px-2 py-1 text-xs">View</Link>
                        <button disabled={busy} onClick={() => researchOne(lead.id)} className="rounded bg-indigo-700 px-2 py-1 text-xs">{lead.lastResearchedAt ? "Re-research" : "Research"}</button>
                        {lead.qualificationDecision === "rebuild_candidate" && <button disabled={busy} onClick={() => prepareOne(lead.id)} className="rounded bg-emerald-700 px-2 py-1 text-xs">Prepare</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <span>{total.toLocaleString()} leads · page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-zinc-700 px-3 py-2 disabled:opacity-40">Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-zinc-700 px-3 py-2 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </main>
  );
}
