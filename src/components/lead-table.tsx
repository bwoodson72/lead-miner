"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import type { Lead } from "@/app/dashboard/page";

interface Props {
  leads: Lead[]; loading: boolean; onUpdate: (id: number, updates: Record<string, unknown>) => void; onDelete: (id: number) => void;
  selectedIds: Set<number>; onToggleSelect: (id: number) => void; onSelectAll: () => void; onBatchReject: (reason: string) => void; onRefresh: () => void;
}

const statuses = ["new", "research_pending", "qualified", "disqualified", "ready_for_outreach", "contacted", "followup_due", "replied", "interested", "call_scheduled", "proposal_sent", "won", "lost", "rejected"];

export default function LeadTable({ leads, loading, onUpdate, onDelete, selectedIds, onToggleSelect, onSelectAll, onBatchReject, onRefresh }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [researching, setResearching] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function research(id: number) {
    setError(null); setResearching(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/leads/${id}/research`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Research failed");
      onRefresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setResearching(prev => { const next = new Set(prev); next.delete(id); return next; }); }
  }

  if (loading) return <div className="py-12 text-center text-zinc-400">Loading leads...</div>;
  if (!leads.length) return <div className="py-12 text-center text-zinc-400">No leads found.</div>;

  return <div>
    {error && <div className="mb-3 rounded border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</div>}
    {selectedIds.size > 0 && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"><span className="text-sm">{selectedIds.size} selected</span><button onClick={() => onBatchReject("agency_managed")} className="rounded bg-orange-700 px-2 py-1 text-xs">Reject agency</button><button onClick={() => onBatchReject("national_chain")} className="rounded bg-orange-700 px-2 py-1 text-xs">Reject chain</button><button onClick={() => onBatchReject("other")} className="rounded bg-zinc-600 px-2 py-1 text-xs">Reject other</button></div>}
    <div className="overflow-x-auto rounded-lg border border-zinc-700"><table className="w-full text-left text-sm text-zinc-300"><thead className="bg-zinc-800 text-xs uppercase text-zinc-400"><tr>
      <th className="px-3 py-3"><input type="checkbox" checked={selectedIds.size === leads.length} onChange={onSelectAll}/></th><th className="px-3 py-3">Business</th><th className="px-3 py-3">Web</th><th className="px-3 py-3">AI priority</th><th className="px-3 py-3">Decision</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th>
    </tr></thead><tbody className="divide-y divide-zinc-800">
      {leads.map(lead => <Fragment key={lead.id}><tr className="cursor-pointer bg-zinc-900 hover:bg-zinc-800/60" onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}>
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => onToggleSelect(lead.id)}/></td>
        <td className="px-3 py-3"><div className="font-medium text-white">{lead.businessName || lead.domain}</div><div className="text-xs text-zinc-500">{lead.domain}</div></td>
        <td className="px-3 py-3"><div>{lead.lighthouseScore}/100</div><div className="text-xs text-zinc-500">LCP {(lead.lcp/1000).toFixed(1)}s</div></td>
        <td className="px-3 py-3"><span className={lead.priorityScore != null && lead.priorityScore >= 70 ? "font-bold text-emerald-400" : "text-zinc-400"}>{lead.priorityScore ?? "—"}</span></td>
        <td className="px-3 py-3"><span className={lead.qualificationDecision === "qualified" ? "text-emerald-400" : lead.qualificationDecision === "disqualified" ? "text-red-400" : "text-zinc-500"}>{lead.qualificationDecision ?? "Not researched"}</span></td>
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}><select value={lead.status} onChange={e => onUpdate(lead.id, { status: e.target.value })} className="rounded bg-zinc-800 px-2 py-1 text-xs">{statuses.map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></td>
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}><div className="flex gap-2"><Link href={`/leads/${lead.id}`} className="rounded bg-emerald-700 px-2 py-1 text-xs font-medium hover:bg-emerald-600">View</Link><button disabled={researching.has(lead.id)} onClick={() => research(lead.id)} className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium disabled:opacity-50">{researching.has(lead.id) ? "Researching…" : lead.lastResearchedAt ? "Re-research" : "AI Research"}</button><button onClick={() => onUpdate(lead.id, { bumpOutreach: true })} className="rounded bg-zinc-700 px-2 py-1 text-xs">Log outreach</button><button onClick={() => window.confirm("Delete this lead permanently?") && onDelete(lead.id)} className="rounded bg-red-800 px-2 py-1 text-xs">Delete</button></div></td>
      </tr>
      {expandedId === lead.id && <tr className="bg-zinc-950"><td colSpan={7} className="px-4 py-5"><div className="grid gap-5 md:grid-cols-2">
        <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">AI research</h3>{lead.researchSummary ? <><p className="text-zinc-200">{lead.researchSummary}</p><p className="mt-3 text-sm"><span className="text-zinc-500">Why qualified:</span> {lead.qualificationReason}</p><p className="mt-2 text-sm"><span className="text-zinc-500">Primary angle:</span> {lead.primaryOutreachAngle ?? "None"}</p><p className="mt-2 text-xs text-zinc-600">Last researched {lead.lastResearchedAt ? new Date(lead.lastResearchedAt).toLocaleString() : "—"}</p></> : <p className="text-zinc-500">Run AI Research to inspect and qualify this prospect.</p>}</div>
        <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Contact & evidence</h3><div className="space-y-1 text-sm"><p>{lead.email ?? "No email"}</p><p>{lead.phone ?? "No phone"}</p><a href={lead.landingPageUrl} target="_blank" rel="noreferrer" className="text-indigo-400">{lead.landingPageUrl}</a><p className="pt-2 text-zinc-500">Source: {lead.adSource} · keyword: {lead.keyword}</p>{lead.isAgencyManaged && <p className="text-orange-400">Agency managed: {lead.agencyName ?? "detected"}</p>}{lead.isNationalChain && <p className="text-red-400">National chain: {lead.chainReason ?? "detected"}</p>}</div></div>
      </div></td></tr>}
      </Fragment>)}
    </tbody></table></div>
  </div>;
}
