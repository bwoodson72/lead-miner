"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LeadTable from "@/components/lead-table";
import DashboardFilters from "@/components/dashboard-filters";
import DashboardStats from "@/components/dashboard-stats";

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
  lastOutreachDate: string | null;
  notes: Array<{ text: string; date: string }>;
  isAgencyManaged: boolean;
  agencyName: string | null;
  isNationalChain: boolean;
  chainReason: string | null;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Filters = {
  status: string;
  search: string;
  hasEmail: boolean;
  hasPhone: boolean;
  sortBy: string;
  sortDir: string;
  hideRejected: boolean;
  hideAgency: boolean;
  hideChains: boolean;
};

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    status: "all",
    search: "",
    hasEmail: false,
    hasPhone: false,
    sortBy: "createdAt",
    sortDir: "desc",
    hideRejected: true,
    hideAgency: false,
    hideChains: false,
  });

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams();
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.hasEmail) params.set("hasEmail", "true");
    if (filters.hasPhone) params.set("hasPhone", "true");
    if (filters.hideRejected) params.set("hideRejected", "true");
    if (filters.hideAgency) params.set("hideAgency", "true");
    if (filters.hideChains) params.set("hideChains", "true");
    params.set("sortBy", filters.sortBy);
    params.set("sortDir", filters.sortDir);

    async function load() {
      const [leadsRes, statsRes] = await Promise.all([
        fetch("/api/leads?" + params.toString()),
        fetch("/api/leads/stats"),
      ]);
      const [leadsData, statsData] = await Promise.all([
        leadsRes.json(),
        statsRes.json(),
      ]);
      if (!cancelled) {
        setLeads(leadsData.leads ?? []);
        setStats(statsData);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [filters, refreshKey]);

  function handleFilterChange(newFilters: Filters) {
    setLoading(true);
    setFilters(newFilters);
  }

  function refresh() {
    setLoading(true);
    setRefreshKey(k => k + 1);
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  }

  async function batchReject(reason: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const res = await fetch("/api/leads/batch-reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, reason }),
    });
    if (res.ok) {
      setSelectedIds(new Set());
      refresh();
    }
  }

  async function deleteLead(id: number) {
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) refresh();
  }

  async function updateLead(id: number, updates: Record<string, unknown>) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lead Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-400">Manage and track your outreach pipeline</p>
          </div>
          <Link href="/" className="rounded-md bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
            Run New Search
          </Link>
        </div>
        {stats && <DashboardStats stats={stats} />}
        <DashboardFilters filters={filters} onChange={handleFilterChange} />
        <LeadTable leads={leads} loading={loading} onUpdate={updateLead} onDelete={deleteLead} selectedIds={selectedIds} onToggleSelect={toggleSelect} onSelectAll={selectAll} onBatchReject={batchReject} />
      </div>
    </div>
  );
}
