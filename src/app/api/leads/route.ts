import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const status = params.get("status");
  const search = params.get("search");
  const hasEmail = params.get("hasEmail");
  const hasPhone = params.get("hasPhone");
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
