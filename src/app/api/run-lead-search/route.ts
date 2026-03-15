import { NextResponse } from "next/server";
import { KeywordInputSchema } from "@/lib/schemas";
import { runLeadSearchPipeline } from "@/lib/pipeline";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = KeywordInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { leads } = await runLeadSearchPipeline(parsed.data);

    return NextResponse.json({ success: true, leadsFound: leads.length, leads });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("run-lead-search error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
