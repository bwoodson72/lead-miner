import { searchAds } from "./serpapi";
import { normalizeUrl, extractRootDomain } from "./normalize-url";
import { analyzeUrlsWithRateLimit } from "./pagespeed";
import { isSlowSite, buildLeadRecord } from "./filters";
import { sendReport } from "./email";
import type { KeywordInput, LeadRecord } from "./schemas";
import type { Thresholds } from "../config/thresholds";

type Diagnostics = {
  keywordsParsed: number;
  adsFound: number;
  uniqueDomains: number;
  pageSpeedResults: number;
  pageSpeedFailures: number;
  slowSites: number;
  emailSent: boolean;
  messages: string[];
};

export async function runLeadSearchPipeline(
  input: KeywordInput
): Promise<{ leads: LeadRecord[]; keywords: string[]; diagnostics: Diagnostics }> {
  const diagnostics: Diagnostics = {
    keywordsParsed: 0,
    adsFound: 0,
    uniqueDomains: 0,
    pageSpeedResults: 0,
    pageSpeedFailures: 0,
    slowSites: 0,
    emailSent: false,
    messages: [],
  };

  const { keywords: keywordsRaw, performanceScore, lcp, cls, tbt, email } = input;

  const keywords = keywordsRaw
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  diagnostics.keywordsParsed = keywords.length;

  const thresholds: Thresholds = { performanceScore, lcp, cls, tbt };

  // Collect all ads across keywords
  const adResults = await Promise.all(keywords.map((keyword) => searchAds(keyword)));
  const allAds = adResults.flat();
  diagnostics.adsFound = allAds.length;

  for (let i = 0; i < keywords.length; i++) {
    diagnostics.messages.push(`Used 2 SerpApi credits for keyword: ${keywords[i]}`);
    if (adResults[i].length === 0) {
      diagnostics.messages.push(`No ads or local businesses found for: ${keywords[i]}`);
    } else {
      diagnostics.messages.push(`Found ${adResults[i].length} results for: ${keywords[i]}`);
    }
  }

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

  diagnostics.uniqueDomains = queue.length;

  // Run PageSpeed analysis with rate limiting
  const pageSpeedMap = await analyzeUrlsWithRateLimit(queue);
  diagnostics.pageSpeedResults = pageSpeedMap.size;
  diagnostics.pageSpeedFailures = queue.length - pageSpeedMap.size;

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

  diagnostics.slowSites = leads.length;

  // Send report
  const emailResult = await sendReport(leads, keywords, email);
  diagnostics.emailSent = emailResult.success;

  return { leads, keywords, diagnostics };
}
