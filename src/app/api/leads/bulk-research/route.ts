import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${API_BASE}/api/leads/bulk-research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ error: "Backend returned an invalid response" }));
  return NextResponse.json(data, { status: response.status });
}
