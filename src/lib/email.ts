import { Resend } from "resend";
import type { LeadRecord } from "./schemas";

export function formatReport(leads: LeadRecord[], keywords: string[]): string {
  const date = new Date().toISOString().split("T")[0];
  const header = [
    "Lead Report — Slow Landing Pages",
    `Generated: ${date}`,
    `Keywords searched: ${keywords.join(", ")}`,
    `Leads found: ${leads.length}`,
  ].join("\n");

  if (leads.length === 0) {
    return `${header}\n\nNo slow landing pages found for the searched keywords.`;
  }

  const grouped = new Map<string, LeadRecord[]>();
  for (const lead of leads) {
    const group = grouped.get(lead.keyword) ?? [];
    group.push(lead);
    grouped.set(lead.keyword, group);
  }

  const sections = [...grouped.entries()].map(([keyword, group]) => {
    const entries = group.map((lead) =>
      [
        lead.domain,
        `Mobile Score: ${lead.performanceScore}`,
        `LCP: ${(lead.lcp / 1000).toFixed(1)}s`,
        `CLS: ${lead.cls.toFixed(2)}`,
        `TBT: ${Math.round(lead.tbt)}ms`,
        `Landing Page: ${lead.landingPageUrl}`,
      ].join("\n")
    );
    return `[${keyword}]\n${entries.join("\n\n")}`;
  });

  return `${header}\n\n${sections.join("\n\n")}`;
}

export async function sendReport(
  leads: LeadRecord[],
  keywords: string[],
  recipientEmail: string
): Promise<{ success: boolean; error?: string }> {
  const { env } = await import("./env");
  const resend = new Resend(env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: "Lead Miner <onboarding@resend.dev>",
      to: recipientEmail,
      subject: "Lead Report: Slow Ad Landing Pages",
      text: formatReport(leads, keywords),
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to send report email:", err);
    return { success: false, error: message };
  }
}
