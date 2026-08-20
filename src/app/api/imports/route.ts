import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";

async function proxyJson(response: Response) {
  const text = await response.text();
  return NextResponse.json(text ? JSON.parse(text) : {}, { status: response.status });
}

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_URL}/api/imports?${request.nextUrl.searchParams.toString()}`, { cache: "no-store" });
    return await proxyJson(response);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${API_URL}/api/imports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    return await proxyJson(response);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
