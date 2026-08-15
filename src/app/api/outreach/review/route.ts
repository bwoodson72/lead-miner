import { NextResponse } from "next/server";

const API_URL = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";

async function proxy(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, { ...init, cache: "no-store" });
    const text = await response.text();
    let body: unknown = {};
    if (text) {
      try { body = JSON.parse(text); }
      catch { body = { error: text }; }
    }
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function GET() {
  return proxy(`${API_URL}/api/outreach/review`);
}

export async function POST() {
  return proxy(`${API_URL}/api/outreach/backfill-drafts`, { method: "POST", headers: { "Content-Type": "application/json" } });
}
