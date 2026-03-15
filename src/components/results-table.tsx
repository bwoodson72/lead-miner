"use client";

import type { LeadRecord } from "@/lib/schemas";

interface ResultsTableProps {
  leads: LeadRecord[];
}

function scoreColor(score: number): string {
  if (score < 40) return "text-red-400";
  if (score < 60) return "text-orange-400";
  return "text-green-400";
}

export default function ResultsTable({ leads }: ResultsTableProps) {
  if (leads.length === 0) {
    return (
      <p className="text-center text-zinc-400 py-8">No slow sites found.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-700">
      <table className="w-full text-sm text-left text-zinc-300">
        <thead className="bg-zinc-800 text-zinc-400 uppercase text-xs tracking-wider">
          <tr>
            <th className="px-4 py-3">Domain</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">LCP</th>
            <th className="px-4 py-3">CLS</th>
            <th className="px-4 py-3">TBT</th>
            <th className="px-4 py-3">Keyword</th>
            <th className="px-4 py-3">Landing Page</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-700">
          {leads.map((lead, i) => (
            <tr key={i} className="bg-zinc-900 hover:bg-zinc-800/60 transition-colors">
              <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                {lead.domain}
              </td>
              <td className={`px-4 py-3 font-semibold ${scoreColor(lead.performanceScore)}`}>
                {lead.performanceScore}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {(lead.lcp / 1000).toFixed(1)}s
              </td>
              <td className="px-4 py-3">
                {lead.cls.toFixed(2)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {Math.round(lead.tbt)}ms
              </td>
              <td className="px-4 py-3 text-zinc-400">
                {lead.keyword}
              </td>
              <td className="px-4 py-3 max-w-[200px]">
                <a
                  href={lead.landingPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline truncate block"
                  title={lead.landingPageUrl}
                >
                  {lead.landingPageUrl}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
