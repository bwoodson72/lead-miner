import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const leadId = parseInt(id);
  try {
    await prisma.lead.delete({ where: { id: leadId } });
    return NextResponse.json({ success: true, id: leadId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 404 }
    );
  }
}
