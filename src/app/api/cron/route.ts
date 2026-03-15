import { NextResponse } from "next/server";
import { DEFAULT_KEYWORDS } from "@/config/keywords";
import { DEFAULT_THRESHOLDS } from "@/config/thresholds";
import { runLeadSearchPipeline } from "@/lib/pipeline";

export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    const { env } = await import("@/lib/env");

    if (env.CRON_SECRET) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const { leads } = await runLeadSearchPipeline({
      keywords: DEFAULT_KEYWORDS.join("\n"),
      performanceScore: DEFAULT_THRESHOLDS.performanceScore,
      lcp: DEFAULT_THRESHOLDS.lcp,
      cls: DEFAULT_THRESHOLDS.cls,
      tbt: DEFAULT_THRESHOLDS.tbt,
      maxDomains: 10,
      email: env.REPORT_EMAIL,
    });

    return NextResponse.json({ success: true, leadsFound: leads.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("cron error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
