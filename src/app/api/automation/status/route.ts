import { NextResponse } from "next/server";

const API_URL = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";

export async function GET() {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured on the frontend server" }, { status: 500 });
  try {
    const response = await fetch(`${API_URL}/api/automation/status`, { cache: "no-store", headers: { Authorization: `Bearer ${secret}` } });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: "Lead Miner API is unavailable", detail: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
