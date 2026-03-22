"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/app/dashboard/page";


function scoreColor(score: number): string {
  if (score < 40) return "text-red-400";
  if (score < 60) return "text-orange-400";
  return "text-green-400";
}

function isOverdue(followUpDate: string | null): boolean {
  if (!followUpDate) return false;
  return new Date(followUpDate) <= new Date();
}

async function patchLead(id: number, updates: Record<string, unknown>) {
  await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

function snoozeDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString();
}

function NewCard({ lead, onRefresh }: { lead: Lead; onRefresh: () => void }) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-700 p-3 space-y-2">
      <div>
        <div className="font-medium text-white text-sm">{lead.businessName || lead.domain}</div>
        {lead.businessName && <div className="text-xs text-zinc-500">{lead.domain}</div>}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-semibold ${scoreColor(lead.lighthouseScore)}`}>{lead.lighthouseScore}</span>
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-400">{(lead.lcp / 1000).toFixed(1)}s LCP</span>
        {lead.isAgencyManaged && <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">Agency</span>}
        {lead.isNationalChain && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Chain</span>}
      </div>
      <div className="text-xs space-y-0.5">
        {lead.email && <div><a href={`mailto:${lead.email}`} className="text-indigo-400 hover:text-indigo-300">{lead.email}</a></div>}
        {lead.phone && <div><a href={`tel:${lead.phone}`} className="text-indigo-400 hover:text-indigo-300">{lead.phone}</a></div>}
      </div>
      <div className="flex gap-1.5 pt-1">
        <button
          onClick={async () => { await patchLead(lead.id, { status: "contacted" }); onRefresh(); }}
          className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          Contact
        </button>
        <button
          onClick={async () => { await patchLead(lead.id, { status: "rejected" }); onRefresh(); }}
          className="rounded bg-orange-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-orange-500 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function ContactedCard({ lead, onRefresh }: { lead: Lead; onRefresh: () => void }) {
  const overdue = isOverdue(lead.followUpDate);
  return (
    <div className={`rounded-lg bg-zinc-900 border p-3 space-y-2 ${overdue ? "border-l-2 border-red-500 bg-red-950/10" : "border-zinc-700"}`}>
      <div>
        <div className="font-medium text-white text-sm">{lead.businessName || lead.domain}</div>
        {lead.businessName && <div className="text-xs text-zinc-500">{lead.domain}</div>}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-semibold ${scoreColor(lead.lighthouseScore)}`}>{lead.lighthouseScore}</span>
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-400">{(lead.lcp / 1000).toFixed(1)}s LCP</span>
        {lead.isAgencyManaged && <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">Agency</span>}
        {lead.isNationalChain && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Chain</span>}
      </div>
      <div className="text-xs space-y-0.5">
        {lead.email && <div><a href={`mailto:${lead.email}`} className="text-indigo-400 hover:text-indigo-300">{lead.email}</a></div>}
        {lead.phone && <div><a href={`tel:${lead.phone}`} className="text-indigo-400 hover:text-indigo-300">{lead.phone}</a></div>}
        {lead.outreachCount > 0 && <div className="text-zinc-500">Outreach: {lead.outreachCount}x</div>}
        {lead.followUpDate && (
          <div className={overdue ? "text-red-400 font-medium" : "text-blue-400"}>
            Follow-up: {new Date(lead.followUpDate).toLocaleDateString()}{overdue ? " (overdue)" : ""}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <button
          onClick={async () => { await patchLead(lead.id, { status: "responded" }); onRefresh(); }}
          className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
        >
          Mark Replied
        </button>
        <button
          onClick={async () => { await patchLead(lead.id, { bumpOutreach: true }); onRefresh(); }}
          className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          Follow Up
        </button>
        <button
          onClick={async () => { await patchLead(lead.id, { followUpDate: snoozeDate() }); onRefresh(); }}
          className="rounded bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-600 transition-colors"
        >
          Snooze 3d
        </button>
      </div>
    </div>
  );
}

function RepliedCard({ lead, onRefresh }: { lead: Lead; onRefresh: () => void }) {
  const [noteText, setNoteText] = useState("");
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-700 p-3 space-y-2">
      <div>
        <div className="font-medium text-white text-sm">{lead.businessName || lead.domain}</div>
        {lead.businessName && <div className="text-xs text-zinc-500">{lead.domain}</div>}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-semibold ${scoreColor(lead.lighthouseScore)}`}>{lead.lighthouseScore}</span>
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-400">{(lead.lcp / 1000).toFixed(1)}s LCP</span>
        {lead.isAgencyManaged && <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">Agency</span>}
        {lead.isNationalChain && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Chain</span>}
      </div>
      <div className="text-xs space-y-0.5">
        {lead.email && <div><a href={`mailto:${lead.email}`} className="text-indigo-400 hover:text-indigo-300">{lead.email}</a></div>}
        {lead.phone && <div><a href={`tel:${lead.phone}`} className="text-indigo-400 hover:text-indigo-300">{lead.phone}</a></div>}
      </div>
      {lead.notes.length > 0 && (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {lead.notes.map((note, i) => (
            <div key={i} className="text-xs bg-zinc-800 rounded px-2 py-1">
              <span className="text-zinc-500">{new Date(note.date).toLocaleDateString()}:</span>{" "}
              <span className="text-zinc-300">{note.text}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1 pt-1">
        <input
          type="text"
          placeholder="Add note..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && noteText.trim()) {
              await patchLead(lead.id, { note: noteText.trim() });
              setNoteText("");
              onRefresh();
            }
          }}
          className="flex-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={async () => { await patchLead(lead.id, { status: "proposal_sent" }); onRefresh(); }}
          className="rounded bg-purple-600 px-2 py-1 text-xs font-medium text-white hover:bg-purple-500 transition-colors"
        >
          Send Proposal
        </button>
        <button
          onClick={async () => { await patchLead(lead.id, { status: "call_scheduled" }); onRefresh(); }}
          className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          Schedule Call
        </button>
      </div>
    </div>
  );
}

function ProposalCard({ lead, onRefresh }: { lead: Lead; onRefresh: () => void }) {
  const [noteText, setNoteText] = useState("");
  const overdue = isOverdue(lead.followUpDate);
  return (
    <div className={`rounded-lg bg-zinc-900 border p-3 space-y-2 ${overdue ? "border-l-2 border-red-500 bg-red-950/10" : "border-zinc-700"}`}>
      <div>
        <div className="font-medium text-white text-sm">{lead.businessName || lead.domain}</div>
        {lead.businessName && <div className="text-xs text-zinc-500">{lead.domain}</div>}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-semibold ${scoreColor(lead.lighthouseScore)}`}>{lead.lighthouseScore}</span>
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-400">{(lead.lcp / 1000).toFixed(1)}s LCP</span>
        {lead.isAgencyManaged && <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">Agency</span>}
        {lead.isNationalChain && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Chain</span>}
      </div>
      <div className="text-xs space-y-0.5">
        {lead.email && <div><a href={`mailto:${lead.email}`} className="text-indigo-400 hover:text-indigo-300">{lead.email}</a></div>}
        {lead.phone && <div><a href={`tel:${lead.phone}`} className="text-indigo-400 hover:text-indigo-300">{lead.phone}</a></div>}
        {lead.followUpDate && (
          <div className={overdue ? "text-red-400 font-medium" : "text-blue-400"}>
            Follow-up: {new Date(lead.followUpDate).toLocaleDateString()}{overdue ? " (overdue)" : ""}
          </div>
        )}
      </div>
      {lead.notes.length > 0 && (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {lead.notes.map((note, i) => (
            <div key={i} className="text-xs bg-zinc-800 rounded px-2 py-1">
              <span className="text-zinc-500">{new Date(note.date).toLocaleDateString()}:</span>{" "}
              <span className="text-zinc-300">{note.text}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1 pt-1">
        <input
          type="text"
          placeholder="Add note..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && noteText.trim()) {
              await patchLead(lead.id, { note: noteText.trim() });
              setNoteText("");
              onRefresh();
            }
          }}
          className="flex-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={async () => { await patchLead(lead.id, { status: "won" }); onRefresh(); }}
          className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-500 transition-colors"
        >
          Won
        </button>
        <button
          onClick={async () => { await patchLead(lead.id, { status: "lost" }); onRefresh(); }}
          className="rounded bg-zinc-600 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-500 transition-colors"
        >
          Lost
        </button>
        <button
          onClick={async () => { await patchLead(lead.id, { followUpDate: snoozeDate() }); onRefresh(); }}
          className="rounded bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-600 transition-colors"
        >
          Snooze 3d
        </button>
      </div>
    </div>
  );
}

type Column = {
  label: string;
  leads: Lead[];
  render: (lead: Lead, onRefresh: () => void) => React.ReactNode;
};

type FollowUpSummary = { overdue: number; dueToday: number; upcoming: number };

function sortByFollowUp(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    const aOverdue = isOverdue(a.followUpDate);
    const bOverdue = isOverdue(b.followUpDate);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (a.followUpDate && b.followUpDate) return new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime();
    if (a.followUpDate && !b.followUpDate) return -1;
    if (!a.followUpDate && b.followUpDate) return 1;
    return 0;
  });
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<FollowUpSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [leadsRes, summaryRes] = await Promise.all([
        fetch("/api/leads?sortBy=createdAt&sortDir=desc"),
        fetch("/api/leads/follow-up-summary"),
      ]);
      const [leadsData, summaryData] = await Promise.all([leadsRes.json(), summaryRes.json()]);
      if (!cancelled) {
        setLeads(leadsData.leads ?? []);
        setSummary(summaryData);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  const columns: Column[] = [
    {
      label: "New Leads",
      leads: leads.filter((l) => l.status === "new"),
      render: (lead, onRefresh) => <NewCard key={lead.id} lead={lead} onRefresh={onRefresh} />,
    },
    {
      label: "Contacted",
      leads: sortByFollowUp(leads.filter((l) => l.status === "contacted")),
      render: (lead, onRefresh) => <ContactedCard key={lead.id} lead={lead} onRefresh={onRefresh} />,
    },
    {
      label: "Replied",
      leads: leads.filter((l) => l.status === "responded" || l.status === "call_scheduled"),
      render: (lead, onRefresh) => <RepliedCard key={lead.id} lead={lead} onRefresh={onRefresh} />,
    },
    {
      label: "Proposal Sent",
      leads: sortByFollowUp(leads.filter((l) => l.status === "proposal_sent")),
      render: (lead, onRefresh) => <ProposalCard key={lead.id} lead={lead} onRefresh={onRefresh} />,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Pipeline</h1>
        {summary && (
          <div className="flex gap-4 mb-6">
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-center flex-1">
              <div className="text-2xl font-bold text-red-400">{summary.overdue}</div>
              <div className="text-xs text-red-400/70">Overdue</div>
            </div>
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 text-center flex-1">
              <div className="text-2xl font-bold text-yellow-400">{summary.dueToday}</div>
              <div className="text-xs text-yellow-400/70">Due Today</div>
            </div>
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 px-4 py-3 text-center flex-1">
              <div className="text-2xl font-bold text-blue-400">{summary.upcoming}</div>
              <div className="text-xs text-blue-400/70">Next 7 Days</div>
            </div>
          </div>
        )}
        {loading ? (
          <div className="text-center text-zinc-400 py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {columns.map((col) => (
              <div key={col.label} className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-zinc-300">{col.label}</h2>
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{col.leads.length}</span>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-260px)] pr-1">
                  {col.leads.length === 0 && (
                    <div className="text-xs text-zinc-600 text-center py-6">No leads</div>
                  )}
                  {col.leads.map((lead) => col.render(lead, refresh))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
