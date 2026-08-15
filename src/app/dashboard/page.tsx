"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LeadTable from "@/components/lead-table";
import DashboardFilters from "@/components/dashboard-filters";
import DashboardStats from "@/components/dashboard-stats";

export type Lead = {
  id: number; domain: string; businessName: string | null; landingPageUrl: string; keyword: string; adSource: string;
  lighthouseScore: number; lcp: number; cls: number | null; tbt: number | null; email: string | null; phone: string | null;
  address: string | null; contactPageUrl: string | null; enrichmentStatus: string | null; status: string; outreachCount: number;
  firstContactAt: string | null; lastOutreachDate: string | null; notes: Array<{ text: string; date: string }>; isAgencyManaged: boolean;
  agencyName: string | null; isNationalChain: boolean; chainReason: string | null; followUpDate: string | null;
  qualificationDecision: string | null; qualificationReason: string | null; priorityScore: number | null; primaryOutreachAngle: string | null;
  researchSummary: string | null; researchVersion: string | null; lastResearchedAt: string | null; replyStatus: string | null; replySummary: string | null;
  lastReplyAt: string | null; createdAt: string; updatedAt: string;
};

export type Filters = { status: string; adSource: string; search: string; hasEmail: boolean; hasPhone: boolean; sortBy: string; sortDir: string; hideRejected: boolean; hideAgency: boolean; hideChains: boolean; };

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState<Filters>({ status: "all", adSource: "all", search: "", hasEmail: false, hasPhone: false, sortBy: "createdAt", sortDir: "desc", hideRejected: true, hideAgency: false, hideChains: false });

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (filters.status !== "all") params.set("status", filters.status); if (filters.adSource !== "all") params.set("adSource", filters.adSource);
    if (filters.search) params.set("search", filters.search); if (filters.hasEmail) params.set("hasEmail", "true"); if (filters.hasPhone) params.set("hasPhone", "true");
    if (filters.hideRejected) params.set("hideRejected", "true"); if (filters.hideAgency) params.set("hideAgency", "true"); if (filters.hideChains) params.set("hideChains", "true");
    params.set("sortBy", filters.sortBy); params.set("sortDir", filters.sortDir);
    async function load() {
      const [leadsRes, statsRes] = await Promise.all([fetch("/api/leads?" + params.toString()), fetch("/api/leads/stats")]);
      const [leadsData, statsData] = await Promise.all([leadsRes.json(), statsRes.json()]);
      if (!cancelled) { setLeads(leadsData.leads ?? []); setStats(statsData); setLoading(false); }
    }
    load(); return () => { cancelled = true; };
  }, [filters, refreshKey]);

  function handleFilterChange(newFilters: Filters) { setLoading(true); setFilters(newFilters); }
  function refresh() { setLoading(true); setRefreshKey(k => k + 1); }
  function toggleSelect(id: number) { setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function selectAll() { setSelectedIds(selectedIds.size === leads.length ? new Set() : new Set(leads.map(l => l.id))); }
  async function batchReject(reason: string) { const ids = Array.from(selectedIds); if (!ids.length) return; const res = await fetch("/api/leads/batch-reject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, reason }) }); if (res.ok) { setSelectedIds(new Set()); refresh(); } }
  async function bulkResearch() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return "No leads selected.";
    const res = await fetch("/api/leads/bulk-research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Bulk research failed");

    const processedIds = new Set<number>((data.results ?? []).map((row: { id: number }) => row.id));
    setSelectedIds(prev => new Set(Array.from(prev).filter(id => !processedIds.has(id))));
    refresh();

    const parts = [
      `${data.researched ?? 0} researched`,
      `${data.emailsDiscovered ?? 0} emails discovered`,
      `${data.skippedNoEmail ?? 0} skipped without email`,
    ];
    if ((data.enrichmentDeferred ?? 0) > 0) parts.push(`${data.enrichmentDeferred} retry deferred`);
    if ((data.enrichmentExhausted ?? 0) > 0) parts.push(`${data.enrichmentExhausted} enrichment exhausted`);
    if ((data.researchFailed ?? 0) > 0) parts.push(`${data.researchFailed} research failed`);
    if ((data.selectedForThisBatch ?? ids.length) < ids.length) parts.push(`${ids.length - data.selectedForThisBatch} remain selected for the next batch`);
    return parts.join(" · ");
  }
  async function deleteLead(id: number) { const res = await fetch(`/api/leads/${id}`, { method: "DELETE" }); if (res.ok) refresh(); }
  async function updateLead(id: number, updates: Record<string, unknown>) { const res = await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }); if (res.ok) refresh(); }

  return <div className="min-h-screen bg-zinc-950 text-white"><div className="mx-auto max-w-7xl px-4 py-8">
    <div className="flex items-center justify-between mb-8"><div><h1 className="text-2xl font-bold tracking-tight">Lead Dashboard</h1><p className="mt-1 text-sm text-zinc-400">Research, qualify and manage your outreach pipeline</p></div><div className="flex items-center gap-3">
      <Link href="/outreach" className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600">Outreach Review</Link>
      <a href={"/api/leads/export?" + (() => { const p = new URLSearchParams(); if (filters.status !== "all") p.set("status", filters.status); if (filters.adSource !== "all") p.set("adSource", filters.adSource); if (filters.search) p.set("search", filters.search); if (filters.hasEmail) p.set("hasEmail", "true"); if (filters.hasPhone) p.set("hasPhone", "true"); if (filters.hideRejected) p.set("hideRejected", "true"); if (filters.hideAgency) p.set("hideAgency", "true"); if (filters.hideChains) p.set("hideChains", "true"); return p.toString(); })()} download className="rounded-md bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700">Export CSV</a>
      <Link href="/" className="rounded-md bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700">Run New Search</Link>
    </div></div>
    {stats && <DashboardStats stats={stats} />}<DashboardFilters filters={filters} onChange={handleFilterChange} />
    <LeadTable leads={leads} loading={loading} onUpdate={updateLead} onDelete={deleteLead} selectedIds={selectedIds} onToggleSelect={toggleSelect} onSelectAll={selectAll} onBatchReject={batchReject} onBulkResearch={bulkResearch} onRefresh={refresh} />
  </div></div>;
}
