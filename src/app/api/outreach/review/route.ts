import { NextResponse } from "next/server";

const API_URL = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/outreach/review`, { cache: "no-store" });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
