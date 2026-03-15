import { describe, it, expect } from "vitest";
import { isSlowSite, buildLeadRecord } from "../filters";
import { DEFAULT_THRESHOLDS } from "../../config/thresholds";
import type { PageSpeedResult } from "../pagespeed";

const passing: PageSpeedResult = {
  url: "https://example.com",
  performanceScore: 90,
  lcp: 2000,
  cls: 0.05,
  tbt: 100,
};

describe("isSlowSite", () => {
  it("flags site that fails on performance score only", () => {
    expect(isSlowSite({ ...passing, performanceScore: 59 }, DEFAULT_THRESHOLDS)).toBe(true);
  });

  it("flags site that fails on LCP only", () => {
    expect(isSlowSite({ ...passing, lcp: 4001 }, DEFAULT_THRESHOLDS)).toBe(true);
  });

  it("flags site that fails on CLS only", () => {
    expect(isSlowSite({ ...passing, cls: 0.26 }, DEFAULT_THRESHOLDS)).toBe(true);
  });

  it("flags site that fails on TBT only", () => {
    expect(isSlowSite({ ...passing, tbt: 301 }, DEFAULT_THRESHOLDS)).toBe(true);
  });

  it("does not flag site that passes all thresholds", () => {
    expect(isSlowSite(passing, DEFAULT_THRESHOLDS)).toBe(false);
  });

  it("flags site that fails all thresholds", () => {
    expect(
      isSlowSite(
        { url: "https://example.com", performanceScore: 10, lcp: 9000, cls: 0.9, tbt: 900 },
        DEFAULT_THRESHOLDS
      )
    ).toBe(true);
  });
});

describe("buildLeadRecord", () => {
  it("produces correct shape with today's date", () => {
    const record = buildLeadRecord({
      keyword: "seo agency",
      domain: "example.com",
      landingPageUrl: "https://example.com/services",
      pageSpeed: passing,
    });

    expect(record.keyword).toBe("seo agency");
    expect(record.domain).toBe("example.com");
    expect(record.landingPageUrl).toBe("https://example.com/services");
    expect(record.performanceScore).toBe(passing.performanceScore);
    expect(record.lcp).toBe(passing.lcp);
    expect(record.cls).toBe(passing.cls);
    expect(record.tbt).toBe(passing.tbt);
    expect(record.timestamp).toBe(new Date().toISOString().split("T")[0]);
  });
});
