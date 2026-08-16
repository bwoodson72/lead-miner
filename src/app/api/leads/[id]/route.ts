import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getApiBase() {
  if (process.env.NODE_ENV === "development") {
    return process.env.LEAD_MINER_DEV_API_URL ?? "http://localhost:3001";
  }
  return process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const leadId = parseInt(id);
  const body = await request.json();

  try {
    const updateData: Record<string, unknown> = {};

    if (body.status) {
      updateData.status = body.status;
    }

    if (body.followUpDate && typeof body.followUpDate === "string") {
      updateData.followUpDate = new Date(body.followUpDate);
    } else if (typeof body.snooze === "number") {
      updateData.followUpDate = new Date(Date.now() + body.snooze * 24 * 60 * 60 * 1000);
    } else if (body.status === "contacted") {
      updateData.followUpDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    } else if (["responded", "call_scheduled", "won", "lost"].includes(body.status)) {
      updateData.followUpDate = null;
    }

    if (body.bumpOutreach) {
      updateData.outreachCount = { increment: 1 };
      updateData.lastOutreachDate = new Date();

      const current = await prisma.lead.findUnique({ where: { id: leadId } });
      if (current?.status === "new") {
        updateData.status = "contacted";
      }
    }

    if (body.note && typeof body.note === "string") {
      const current = await prisma.lead.findUnique({ where: { id: leadId } });
      const existingNotes = (current?.notes as Array<{ text: string; date: string }>) ?? [];
      existingNotes.push({
        text: body.note,
        date: new Date().toISOString(),
      });
      updateData.notes = existingNotes;
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    return NextResponse.json({ lead });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  const apiBase = getApiBase();
  console.log(`[Lead Miner proxy] delete lead ${leadId} -> ${apiBase}`);
  const response = await fetch(`${apiBase}/api/leads/${leadId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({ error: "Backend returned an invalid response" }));
  if (!response.ok) {
    console.warn(`[Lead Miner proxy] delete lead ${leadId} failed ${response.status}:`, body);
  }
  return NextResponse.json(body, { status: response.status });
}
