import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const adSource = params.get("adSource");
  const search = params.get("search");
  const hasEmail = params.get("hasEmail");
  const hasPhone = params.get("hasPhone");
  const hideRejected = params.get("hideRejected");
  const hideAgency = params.get("hideAgency");
  const hideChains = params.get("hideChains");

  const where: Prisma.LeadWhereInput = {};

  if (status && status !== "all") where.status = status;
  if (adSource === "paid_ad" || adSource === "local_organic") where.adSource = adSource;
  if (search) {
    where.OR = [
      { domain: { contains: search, mode: "insensitive" } },
      { businessName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (hasEmail === "true") where.email = { not: null };
  if (hasPhone === "true") where.phone = { not: null };
  if (hideRejected === "true" && !status) where.status = { not: "rejected" };
  if (hideAgency === "true") where.isAgencyManaged = false;
  if (hideChains === "true") where.isNationalChain = false;

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ adSource: "desc" }, { lcp: "desc" }],
  });

  const headers = [
    "Business Name",
    "Domain",
    "Source",
    "Website",
    "Phone",
    "Email",
    "Address",
    "Keyword",
    "PageSpeed Score",
    "LCP (ms)",
    "Status",
    "Outreach Count",
    "Last Outreach",
    "Follow Up Date",
    "Agency Managed",
    "National Chain",
  ];

  const rows = leads.map((lead) => [
    lead.businessName ?? "",
    lead.domain,
    lead.adSource === "paid_ad" ? "Paid Ad" : "Organic",
    lead.landingPageUrl,
    lead.phone ?? "",
    lead.email ?? "",
    lead.address ?? "",
    lead.keyword,
    lead.lighthouseScore,
    lead.lcp,
    lead.status,
    lead.outreachCount,
    lead.lastOutreachDate?.toISOString() ?? "",
    lead.followUpDate?.toISOString() ?? "",
    lead.isAgencyManaged ? "Yes" : "No",
    lead.isNationalChain ? "Yes" : "No",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leads.csv"',
    },
  });
}
