import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";

async function proxy(init?: RequestInit) {
  try {
    const response = await fetch(`${API_URL}/api/settings`, { ...init, cache: "no-store" });
    const text = await response.text();
    let body: unknown = {};
    if (text) { try { body = JSON.parse(text); } catch { body = { error: text }; } }
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: "Lead Miner API is unavailable", detail: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function GET() { return proxy(); }
export async function PUT(request: NextRequest) {
  return proxy({ method: "PUT", headers: { "Content-Type": "application/json" }, body: await request.text() });
}
