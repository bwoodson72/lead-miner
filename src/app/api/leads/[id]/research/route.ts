import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const response = await fetch(`${API_BASE}/api/leads/${id}/research`, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store" });
  const body = await response.json().catch(() => ({ error: "Backend returned an invalid response" }));
  return NextResponse.json(body, { status: response.status });
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const response = await fetch(`${API_BASE}/api/leads/${id}/research`, { cache: "no-store" });
  const body = await response.json().catch(() => ({ error: "Backend returned an invalid response" }));
  return NextResponse.json(body, { status: response.status });
}
