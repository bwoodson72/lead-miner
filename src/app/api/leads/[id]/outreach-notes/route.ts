import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const response = await fetch(`${API_URL}/api/leads/${id}/outreach-notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const text = await response.text();
    if (!text) return NextResponse.json({}, { status: response.status });
    try {
      return NextResponse.json(JSON.parse(text), { status: response.status });
    } catch {
      return NextResponse.json({ error: `Lead Miner API returned a non-JSON response (${response.status})`, detail: text.slice(0, 500) }, { status: response.ok ? 502 : response.status });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
