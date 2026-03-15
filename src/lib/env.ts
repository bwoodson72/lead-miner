import { z } from "zod";

const envSchema = z.object({
  SERPAPI_KEY: z.string().min(1),
  PAGESPEED_API_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  REPORT_EMAIL: z.string().email(),
  CRON_SECRET: z.string().min(1).optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(`Missing or invalid environment variables: ${missing}`);
}

export const env = result.data;
