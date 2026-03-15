import { describe, it, expect } from "vitest";
import { formatReport } from "../email";
import type { LeadRecord } from "../schemas";

const today = new Date().toISOString().split("T")[0];

function makeRecord(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    keyword: "seo agency",
    domain: "example.com",
    landingPageUrl: "https://example.com/services",
    performanceScore: 45,
    lcp: 5200,
    cls: 0.18,
    tbt: 420,
    timestamp: today,
    ...overrides,
  };
}

describe("formatReport", () => {
  it("returns no-leads message when leads array is empty", () => {
    const output = formatReport([], ["seo agency"]);
    expect(output).toContain("Leads found: 0");
    expect(output).toContain(
      "No slow landing pages found for the searched keywords."
    );
  });

  it("includes header metadata", () => {
    const output = formatReport([makeRecord()], ["seo agency"]);
    expect(output).toContain("Lead Report — Slow Landing Pages");
    expect(output).toContain(`Generated: ${today}`);
    expect(output).toContain("Keywords searched: seo agency");
    expect(output).toContain("Leads found: 1");
  });

  it("groups leads by keyword", () => {
    const leads = [
      makeRecord({ keyword: "seo agency", domain: "slow1.com", landingPageUrl: "https://slow1.com" }),
      makeRecord({ keyword: "ppc agency", domain: "slow2.com", landingPageUrl: "https://slow2.com" }),
    ];
    const output = formatReport(leads, ["seo agency", "ppc agency"]);
    expect(output).toContain("[seo agency]");
    expect(output).toContain("slow1.com");
    expect(output).toContain("[ppc agency]");
    expect(output).toContain("slow2.com");
  });

  it("formats LCP as seconds with one decimal", () => {
    const output = formatReport([makeRecord({ lcp: 5200 })], ["seo agency"]);
    expect(output).toContain("LCP: 5.2s");
  });

  it("formats LCP rounds correctly for whole seconds", () => {
    const output = formatReport([makeRecord({ lcp: 4000 })], ["seo agency"]);
    expect(output).toContain("LCP: 4.0s");
  });

  it("formats CLS with two decimals", () => {
    const output = formatReport([makeRecord({ cls: 0.18 })], ["seo agency"]);
    expect(output).toContain("CLS: 0.18");
  });

  it("formats TBT as integer ms", () => {
    const output = formatReport([makeRecord({ tbt: 420.7 })], ["seo agency"]);
    expect(output).toContain("TBT: 421ms");
  });

  it("includes landing page URL", () => {
    const output = formatReport(
      [makeRecord({ landingPageUrl: "https://example.com/services" })],
      ["seo agency"]
    );
    expect(output).toContain("Landing Page: https://example.com/services");
  });

  it("includes mobile score", () => {
    const output = formatReport([makeRecord({ performanceScore: 45 })], ["seo agency"]);
    expect(output).toContain("Mobile Score: 45");
  });

  it("groups multiple leads under same keyword correctly", () => {
    const leads = [
      makeRecord({ domain: "site1.com", landingPageUrl: "https://site1.com" }),
      makeRecord({ domain: "site2.com", landingPageUrl: "https://site2.com" }),
    ];
    const output = formatReport(leads, ["seo agency"]);
    // Only one keyword group header
    expect(output.split("[seo agency]").length - 1).toBe(1);
    expect(output).toContain("site1.com");
    expect(output).toContain("site2.com");
  });
});
