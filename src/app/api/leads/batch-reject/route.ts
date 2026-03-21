import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ids, reason } = body;

  if (!Array.isArray(ids) || ids.length === 0 || typeof reason !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const validReasons = ["agency_managed", "national_chain", "not_a_business", "already_has_vendor", "bad_data", "other"];
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
      data: { status: "rejected", notes: existingNotes },
    });
    count++;
  }

  return NextResponse.json({ success: true, count });
}
