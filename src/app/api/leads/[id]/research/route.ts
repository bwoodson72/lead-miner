import { NextRequest, NextResponse } from "next/server";

function getApiBase() {
  if (process.env.NODE_ENV === "development") {
    return process.env.LEAD_MINER_DEV_API_URL ?? "http://localhost:3001";
  }
  return process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";
}

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const apiBase = getApiBase();
  console.log(`[Lead Miner proxy] research lead ${id} -> ${apiBase}`);
  const response = await fetch(`${apiBase}/api/leads/${id}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({ error: "Backend returned an invalid response" }));
  if (!response.ok) {
    console.warn(`[Lead Miner proxy] research lead ${id} failed ${response.status}:`, body);
  }
  return NextResponse.json(body, { status: response.status });
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}/api/leads/${id}/research`, { cache: "no-store" });
  const body = await response.json().catch(() => ({ error: "Backend returned an invalid response" }));
  return NextResponse.json(body, { status: response.status });
}
