import { NextResponse } from "next/server";

const API_URL = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/dashboard/summary`, { cache: "no-store" });
    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: "Backend dashboard summary failed", detail: text || response.statusText },
        { status: response.status },
      );
    }

    const summary = text ? JSON.parse(text) as Record<string, number> : {};
    return NextResponse.json({
      total: 0,
      new_count: summary.newLeads ?? 0,
      contacted_count: 0,
      responded_count: summary.replies ?? 0,
      proposal_sent_count: 0,
      won_count: 0,
      lost_count: 0,
      with_email: 0,
      with_phone: 0,
      avg_score: 0,
      rejected_count: 0,
      agency_count: 0,
      chain_count: 0,
      follow_up_due: summary.followupsDue ?? 0,
      paid_ad_count: 0,
      qualified_count: summary.qualified ?? 0,
      ready_for_outreach_count: summary.ready ?? 0,
      interested_count: summary.interested ?? 0,
      ai_failures: summary.aiFailures ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Lead Miner API is unavailable", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
