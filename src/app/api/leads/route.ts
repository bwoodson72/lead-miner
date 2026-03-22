import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const status = params.get("status");
  const search = params.get("search");
  const hasEmail = params.get("hasEmail");
  const hasPhone = params.get("hasPhone");
  const hideRejected = params.get("hideRejected");
  const hideAgency = params.get("hideAgency");
  const hideChains = params.get("hideChains");
  const sortBy = params.get("sortBy") || "createdAt";
  const sortDir = params.get("sortDir") || "desc";

  const where: Prisma.LeadWhereInput = {};

  if (status && status !== "all") {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { domain: { contains: search, mode: "insensitive" } },
      { businessName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (hasEmail === "true") {
    where.email = { not: null };
  }
  if (hasPhone === "true") {
    where.phone = { not: null };
  }
  if (hideRejected === "true" && !status) {
    where.status = { not: "rejected" };
  }
  if (hideAgency === "true") {
    where.isAgencyManaged = false;
  }
  if (hideChains === "true") {
    where.isNationalChain = false;
  }

  const sortMap: Record<string, string> = {
    createdAt: "createdAt",
    lighthouseScore: "lighthouseScore",
    lcp: "lcp",
    outreachCount: "outreachCount",
    lastOutreachDate: "lastOutreachDate",
    domain: "domain",
    status: "status",
  };

  const orderField = sortMap[sortBy] || "createdAt";
  const orderDir = sortDir === "asc" ? "asc" : "desc";

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { [orderField]: orderDir },
  });

  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ids, reason } = body;
  if (!Array.isArray(ids) || ids.length === 0 || typeof reason !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const validReasons = ["agency_managed", "national_chain", "not_a_business", "already_has_vendor", "bad_data", "parked_domain", "other"];
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }
  let count = 0;
  for (const id of ids) {
    const current = await prisma.lead.findUnique({ where: { id } });
    if (!current) continue;
    const existingNotes = (current.notes as Array<Record<string, string>>) ?? [];
    existingNotes.push({ reason, rejectedAt: new Date().toISOString() });
    await prisma.lead.update({
      where: { id },
      data: { status: "rejected", notes: existingNotes, followUpDate: null },
    });
    count++;
  }
  return NextResponse.json({ success: true, count });
}
