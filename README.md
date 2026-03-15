# Lead Miner

Internal tool that finds businesses running Google Ads with slow landing pages, analyzes their mobile performance using Google PageSpeed Insights, and emails a lead report. Enter keywords, set performance thresholds, and the tool scrapes ad results, scores each landing page, filters for poor performers, and delivers a formatted report to your inbox.

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in:
   - `SERPAPI_KEY` — get from [serpapi.com](https://serpapi.com)
   - `PAGESPEED_API_KEY` — get from Google Cloud Console (enable the PageSpeed Insights API)
   - `RESEND_API_KEY` — get from [resend.com](https://resend.com)
   - `REPORT_EMAIL` — your email address (where reports are sent)
   - `CRON_SECRET` *(optional)* — secret for protecting the `/api/cron` endpoint
4. `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Usage

- Enter keywords (one per line), adjust the performance thresholds, enter your report email, and click **Run Lead Search**
- Results appear in-page as a table and a formatted report is emailed to the address provided

## Scheduled Runs

- Deploy to Vercel — the `vercel.json` cron config is included
- The cron job runs every Monday at 8 AM UTC, calling `/api/cron`
- To change the schedule, edit the `crons[].schedule` field in `vercel.json`
- To change the default keywords or thresholds, edit:
  - `/src/config/keywords.ts` — `DEFAULT_KEYWORDS` array
  - `/src/config/thresholds.ts` — `DEFAULT_THRESHOLDS` object

## Tech Stack

- **Next.js + TypeScript** — App Router, API routes
- **Tailwind CSS** — styling
- **React Hook Form + Zod** — form validation
- **SerpApi** — Google SERP / ad scraping
- **Google PageSpeed Insights API** — mobile performance scoring
- **Resend** — transactional email delivery

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Main UI page
│   └── api/
│       ├── run-lead-search/route.ts      # POST endpoint — runs pipeline on demand
│       └── cron/route.ts                 # GET endpoint — scheduled weekly run
├── components/
│   ├── keyword-form.tsx                  # Form for keywords, thresholds, and email
│   └── results-table.tsx                 # Table display for lead results
├── config/
│   ├── keywords.ts                       # Default keywords for scheduled runs
│   └── thresholds.ts                     # Default performance thresholds
└── lib/
    ├── pipeline.ts                       # Core pipeline: search → analyze → filter → email
    ├── serpapi.ts                        # SerpApi integration — fetches ads for a keyword
    ├── pagespeed.ts                      # PageSpeed Insights API — scores a landing page
    ├── filters.ts                        # Threshold filtering and lead record construction
    ├── email.ts                          # Report formatting and Resend email delivery
    ├── normalize-url.ts                  # URL cleaning and root domain extraction
    ├── schemas.ts                        # Zod schemas and TypeScript types
    └── env.ts                            # Validated environment variable access
```
