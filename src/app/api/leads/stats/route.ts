import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [total, newCount, contactedCount, respondedCount, proposalCount, wonCount, lostCount, withEmail, withPhone, rejectedCount, agencyCount, chainCount, followUpDueCount] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "new" } }),
    prisma.lead.count({ where: { status: "contacted" } }),
    prisma.lead.count({ where: { status: "responded" } }),
    prisma.lead.count({ where: { status: "proposal_sent" } }),
    prisma.lead.count({ where: { status: "won" } }),
    prisma.lead.count({ where: { status: "lost" } }),
    prisma.lead.count({ where: { email: { not: null } } }),
    prisma.lead.count({ where: { phone: { not: null } } }),
    prisma.lead.count({ where: { status: "rejected" } }),
    prisma.lead.count({ where: { isAgencyManaged: true } }),
    prisma.lead.count({ where: { isNationalChain: true } }),
    prisma.lead.count({ where: { followUpDate: { lte: new Date() }, status: "contacted" } }),
  ]);

  const avgResult = await prisma.lead.aggregate({
    _avg: { lighthouseScore: true },
  });

  return NextResponse.json({
    total,
    new_count: newCount,
    contacted_count: contactedCount,
    responded_count: respondedCount,
    proposal_sent_count: proposalCount,
    won_count: wonCount,
    lost_count: lostCount,
    with_email: withEmail,
    with_phone: withPhone,
    avg_score: Math.round(avgResult._avg.lighthouseScore ?? 0),
    rejected_count: rejectedCount,
    agency_count: agencyCount,
    chain_count: chainCount,
    follow_up_due: followUpDueCount,
  });
}
