"use client";

import type { Filters } from "@/app/dashboard/page";

interface FilterProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "responded", label: "Responded" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest" },
  { value: "lighthouseScore", label: "Worst Score" },
  { value: "lcp", label: "Slowest LCP" },
  { value: "outreachCount", label: "Most Contacted" },
  { value: "lastOutreachDate", label: "Last Contacted" },
];

export default function DashboardFilters({ filters, onChange }: FilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <input
        type="text"
        placeholder="Search domain or business..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
      />
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select
        value={filters.sortBy}
        onChange={(e) => {
          const sortBy = e.target.value;
          const sortDir = sortBy === "lighthouseScore" ? "asc" : "desc";
          onChange({ ...filters, sortBy, sortDir });
        }}
        className="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-sm text-zinc-400 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.hasEmail}
          onChange={(e) => onChange({ ...filters, hasEmail: e.target.checked })}
          className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
        />
        Has Email
      </label>
      <label className="flex items-center gap-1.5 text-sm text-zinc-400 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.hasPhone}
          onChange={(e) => onChange({ ...filters, hasPhone: e.target.checked })}
          className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
        />
        Has Phone
      </label>
    </div>
  );
}
