"use client";

import { useState, Fragment } from "react";
import type { Lead } from "@/app/dashboard/page";

interface LeadTableProps {
  leads: Lead[];
  loading: boolean;
  onUpdate: (id: number, updates: Record<string, unknown>) => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-500/20 text-blue-400" },
  { value: "contacted", label: "Contacted", color: "bg-amber-500/20 text-amber-400" },
  { value: "responded", label: "Responded", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "proposal_sent", label: "Proposal", color: "bg-purple-500/20 text-purple-400" },
  { value: "won", label: "Won", color: "bg-green-500/20 text-green-400" },
  { value: "lost", label: "Lost", color: "bg-zinc-500/20 text-zinc-400" },
];

function scoreColor(score: number): string {
  if (score < 40) return "text-red-400";
  if (score < 60) return "text-orange-400";
  return "text-green-400";
}

function getStatusStyle(status: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-zinc-500/20 text-zinc-400";
}

export default function LeadTable({ leads, loading, onUpdate }: LeadTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");

  if (loading) {
    return <div className="text-center text-zinc-400 py-12">Loading leads...</div>;
  }

  if (leads.length === 0) {
    return <div className="text-center text-zinc-400 py-12">No leads found. Run a search to discover leads.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-700">
      <table className="w-full text-sm text-left text-zinc-300">
        <thead className="bg-zinc-800 text-zinc-400 uppercase text-xs tracking-wider">
          <tr>
            <th className="px-3 py-3">Domain</th>
            <th className="px-3 py-3">Score</th>
            <th className="px-3 py-3">LCP</th>
            <th className="px-3 py-3">Source</th>
            <th className="px-3 py-3">Contact</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Outreach</th>
            <th className="px-3 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-700">
          {leads.map((lead) => (
            <Fragment key={lead.id}>
              <tr
                className="bg-zinc-900 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
              >
                <td className="px-3 py-3">
                  <div className="font-medium text-white">{lead.businessName || lead.domain}</div>
                  {lead.businessName && <div className="text-xs text-zinc-500">{lead.domain}</div>}
                </td>
                <td className={`px-3 py-3 font-semibold ${scoreColor(lead.lighthouseScore)}`}>{lead.lighthouseScore}</td>
                <td className="px-3 py-3 whitespace-nowrap">{(lead.lcp / 1000).toFixed(1)}s</td>
                <td className="px-3 py-3">
                  <span className={lead.adSource === "paid_ad" ? "text-amber-400" : "text-emerald-400"}>
                    {lead.adSource === "paid_ad" ? "Ad" : "Organic"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    {lead.email && <span className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400" title={lead.email}>Email</span>}
                    {lead.phone && <span className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400" title={lead.phone}>Phone</span>}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <select
                    value={lead.status}
                    onChange={(e) => { e.stopPropagation(); onUpdate(lead.id, { status: e.target.value }); }}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${getStatusStyle(lead.status)}`}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="font-semibold">{lead.outreachCount}</span>
                  {lead.lastOutreachDate && (
                    <div className="text-xs text-zinc-500">{new Date(lead.lastOutreachDate).toLocaleDateString()}</div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); onUpdate(lead.id, { bumpOutreach: true }); }}
                    className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                  >
                    Log Outreach
                  </button>
                </td>
              </tr>

              {expandedId === lead.id && (
                <tr className="bg-zinc-900/50">
                  <td colSpan={8} className="px-4 py-4">
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Contact Info</div>
                          {lead.email && <div className="text-zinc-300">Email: <a href={`mailto:${lead.email}`} className="text-indigo-400 hover:text-indigo-300">{lead.email}</a></div>}
                          {lead.phone && <div className="text-zinc-300">Phone: <a href={`tel:${lead.phone}`} className="text-indigo-400 hover:text-indigo-300">{lead.phone}</a></div>}
                          {lead.address && <div className="text-zinc-300">Address: {lead.address}</div>}
                          {lead.contactPageUrl && <div><a href={lead.contactPageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs">Contact Page</a></div>}
                          {!lead.email && !lead.phone && <div className="text-zinc-500">No contact info found</div>}
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Performance</div>
                          <div className="text-zinc-300">Score: {lead.lighthouseScore}/100 · LCP: {(lead.lcp / 1000).toFixed(1)}s{lead.cls !== null ? ` · CLS: ${lead.cls.toFixed(2)}` : ""}{lead.tbt !== null ? ` · TBT: ${lead.tbt}ms` : ""}</div>
                          <div className="text-zinc-400 text-xs mt-0.5">Keyword: &quot;{lead.keyword}&quot;</div>
                          <a href={lead.landingPageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs">{lead.landingPageUrl}</a>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Notes</div>
                        <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                          {lead.notes.length === 0 && <div className="text-zinc-500 text-xs">No notes yet</div>}
                          {lead.notes.map((note, i) => (
                            <div key={i} className="text-xs bg-zinc-800 rounded px-2 py-1.5">
                              <span className="text-zinc-500">{new Date(note.date).toLocaleDateString()}:</span>{" "}
                              <span className="text-zinc-300">{note.text}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add a note..."
                            value={expandedId === lead.id ? noteText : ""}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && noteText.trim()) {
                                onUpdate(lead.id, { note: noteText.trim() });
                                setNoteText("");
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (noteText.trim()) { onUpdate(lead.id, { note: noteText.trim() }); setNoteText(""); }
                            }}
                            className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
