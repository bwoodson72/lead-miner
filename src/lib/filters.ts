import type { PageSpeedResult } from "./pagespeed";
import { LeadRecordSchema, type LeadRecord } from "./schemas";
import type { Thresholds } from "../config/thresholds";

export function isSlowSite(result: PageSpeedResult, thresholds: Thresholds): boolean {
  return (
    result.performanceScore < thresholds.performanceScore ||
    result.lcp > thresholds.lcp ||
    result.cls > thresholds.cls ||
    result.tbt > thresholds.tbt
  );
}

export function buildLeadRecord(params: {
  keyword: string;
  domain: string;
  landingPageUrl: string;
  pageSpeed: PageSpeedResult;
}): LeadRecord {
  return LeadRecordSchema.parse({
    keyword: params.keyword,
    domain: params.domain,
    landingPageUrl: params.landingPageUrl,
    performanceScore: params.pageSpeed.performanceScore,
    lcp: params.pageSpeed.lcp,
    cls: params.pageSpeed.cls,
    tbt: params.pageSpeed.tbt,
    timestamp: new Date().toISOString().split("T")[0],
  });
}
