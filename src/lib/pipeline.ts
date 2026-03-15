import { searchAds } from "./serpapi";
import { normalizeUrl, extractRootDomain } from "./normalize-url";
import { analyzeUrlsWithRateLimit } from "./pagespeed";
import { isSlowSite, buildLeadRecord } from "./filters";
import { sendReport } from "./email";
import type { KeywordInput, LeadRecord } from "./schemas";
import type { Thresholds } from "../config/thresholds";

export async function runLeadSearchPipeline(
  input: KeywordInput
): Promise<{ leads: LeadRecord[]; keywords: string[] }> {
  const { keywords: keywordsRaw, performanceScore, lcp, cls, tbt, email } = input;

  const keywords = keywordsRaw
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  const thresholds: Thresholds = { performanceScore, lcp, cls, tbt };

  // Collect all ads across keywords
  const allAds = (
    await Promise.all(keywords.map((keyword) => searchAds(keyword)))
  ).flat();

  // Normalize URLs and extract domains; deduplicate by domain
  const seenDomains = new Set<string>();
  const queue: { url: string; domain: string; keyword: string }[] = [];

  for (const ad of allAds) {
    let normalizedUrl: string;
    let domain: string;
    try {
      normalizedUrl = normalizeUrl(ad.landingPageUrl);
      domain = extractRootDomain(ad.landingPageUrl);
    } catch {
      continue;
    }
    if (seenDomains.has(domain)) continue;
    seenDomains.add(domain);
    queue.push({ url: normalizedUrl, domain, keyword: ad.keyword });
  }

  // Run PageSpeed analysis with rate limiting
  const pageSpeedMap = await analyzeUrlsWithRateLimit(queue);

  // Filter slow sites and build lead records
  const leads: LeadRecord[] = [];
  for (const { url, domain, keyword } of queue) {
    const result = pageSpeedMap.get(domain);
    if (!result) continue;
    if (!isSlowSite(result, thresholds)) continue;
    leads.push(
      buildLeadRecord({ keyword, domain, landingPageUrl: url, pageSpeed: result })
    );
  }

  // Send report
  await sendReport(leads, keywords, email);

  return { leads, keywords };
}
