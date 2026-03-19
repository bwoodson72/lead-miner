"use client";

import { useState, useEffect, useCallback } from "react";
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
};

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    status: "all",
    search: "",
    hasEmail: false,
    hasPhone: false,
    sortBy: "createdAt",
    sortDir: "desc",
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.hasEmail) params.set("hasEmail", "true");
    if (filters.hasPhone) params.set("hasPhone", "true");
    params.set("sortBy", filters.sortBy);
    params.set("sortDir", filters.sortDir);

    const res = await fetch("/api/leads?" + params.toString());
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }, [filters]);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/leads/stats");
    const data = await res.json();
    setStats(data);
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [fetchLeads, fetchStats]);

  async function updateLead(id: number, updates: Record<string, unknown>) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      fetchLeads();
      fetchStats();
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lead Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-400">Manage and track your outreach pipeline</p>
          </div>
          <a href="/" className="rounded-md bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
            Run New Search
          </a>
        </div>
        {stats && <DashboardStats stats={stats} />}
        <DashboardFilters filters={filters} onChange={setFilters} />
        <LeadTable leads={leads} loading={loading} onUpdate={updateLead} />
      </div>
    </div>
  );
}
