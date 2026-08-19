import { z } from "zod";

export const KeywordInputSchema = z.object({
  keywords: z.string().min(1),
  performanceScore: z.number().default(60),
  lcp: z.number().default(4000),
  cls: z.number().default(0.25),
  tbt: z.number().default(300),
  maxDomains: z.number().min(1).max(200).default(100),
  location: z.string().optional().default(""),
});

export type KeywordInput = z.infer<typeof KeywordInputSchema>;

export const SerpAdSchema = z.object({
  keyword: z.string(),
  adTitle: z.string(),
  landingPageUrl: z.string().url(),
  displayDomain: z.string(),
});

export type SerpAd = z.infer<typeof SerpAdSchema>;

export const LeadRecordSchema = z.object({
  keyword: z.string(),
  domain: z.string(),
  landingPageUrl: z.string().url(),
  performanceScore: z.number().nullable(),
  lcp: z.number().nullable(),
  cls: z.number().nullable(),
  tbt: z.number().nullable(),
  adSource: z.enum(["paid_ad", "local_organic"]),
  timestamp: z.string(),
  screeningStatus: z.enum(["pending", "complete", "partial", "failed"]).optional(),
  performanceOpportunity: z.enum(["strong", "moderate", "none", "unknown"]).optional(),
  lastScreenedAt: z.string().optional(),
});

export type LeadRecord = z.infer<typeof LeadRecordSchema>;
