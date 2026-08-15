import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";

async function proxy(response: Response) {
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  return NextResponse.json(body, { status: response.status });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try { return proxy(await fetch(`${API_URL}/api/outreach/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: await request.text(), cache: "no-store" })); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 }); }
}

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try { return proxy(await fetch(`${API_URL}/api/outreach/${id}/send`, { method: "POST", cache: "no-store" })); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 }); }
}
