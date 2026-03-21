"use client";

interface StatsProps {
  stats: Record<string, number>;
}

export default function DashboardStats({ stats }: StatsProps) {
  const cards = [
    { label: "Total Leads", value: stats.total ?? 0, color: "text-white" },
    { label: "New", value: stats.new_count ?? 0, color: "text-blue-400" },
    { label: "Contacted", value: stats.contacted_count ?? 0, color: "text-amber-400" },
    { label: "Responded", value: stats.responded_count ?? 0, color: "text-emerald-400" },
    { label: "Proposals", value: stats.proposal_sent_count ?? 0, color: "text-purple-400" },
    { label: "Won", value: stats.won_count ?? 0, color: "text-green-400" },
    { label: "With Email", value: stats.with_email ?? 0, color: "text-zinc-300" },
    { label: "With Phone", value: stats.with_phone ?? 0, color: "text-zinc-300" },
    { label: "Rejected", value: stats.rejected_count ?? 0, color: "text-red-400" },
    { label: "Agency", value: stats.agency_count ?? 0, color: "text-orange-400" },
    { label: "Chains", value: stats.chain_count ?? 0, color: "text-orange-400" },
  ];

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-center min-w-[100px] flex-1">
          <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
