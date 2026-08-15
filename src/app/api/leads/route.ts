import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";

async function proxyJson(url: string, init?: RequestInit) {
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
    return NextResponse.json(
      { error: "Lead Miner API is unavailable", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return proxyJson(`${API_URL}/api/leads${query ? `?${query}` : ""}`);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyJson(`${API_URL}/api/leads/batch-reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
