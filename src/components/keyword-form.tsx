"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeywordInputSchema, type KeywordInput, type LeadRecord } from "@/lib/schemas";
import { getApiUrl } from "@/lib/env";
import ProgressMeter from "@/components/progress-meter";

interface ResultsData {
  leads: LeadRecord[];
  keywords: string[];
  diagnostics: Record<string, unknown>;
}

interface KeywordFormProps {
  onResults: (data: ResultsData) => void;
}

function overallProgress(stage: string | null, detail: string | null) {
  if (!stage) return null;
  const count = detail?.match(/(\d+)\s+of\s+(\d+)/i);
  const ratio = count && Number(count[2]) > 0 ? Number(count[1]) / Number(count[2]) : null;
  if (stage === "starting") return 2;
  if (stage === "searching") return 10;
  if (stage === "persisting") return 15;
  if (stage === "analyzing") return ratio == null ? 25 : 20 + ratio * 35;
  if (stage === "enriching") return ratio == null ? 60 : 55 + ratio * 20;
  if (stage === "saving") return 78;
  if (stage === "researching") return ratio == null ? 85 : 80 + ratio * 18;
  if (stage === "complete") return 100;
  return null;
}

export default function KeywordForm({ onResults }: KeywordFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KeywordInput>({
    resolver: zodResolver(KeywordInputSchema) as Resolver<KeywordInput>,
    defaultValues: {
      performanceScore: 60,
      lcp: 4000,
      cls: 0.25,
      tbt: 300,
      location: "",
    },
  });

  async function onSubmit(data: KeywordInput) {
    setLoading(true);
    setErrorMsg(null);
    setProgress(null);
    setProgressStage("starting");

    const apiUrl = getApiUrl();

    try {
      const startRes = await fetch(apiUrl + "/api/run-lead-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!startRes.ok) {
        let errorMessage = "Request failed with status " + startRes.status;
        try {
          const json = await startRes.json();
          if (json.error) errorMessage = json.error;
        } catch {}
        setErrorMsg(errorMessage);
        setLoading(false);
        return;
      }

      const startJson = await startRes.json();
      if (!startJson.jobId) {
        setErrorMsg("No job ID returned from server.");
        setLoading(false);
        return;
      }

      const jobId = startJson.jobId;

      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(apiUrl + "/api/jobs/" + jobId);
          if (!pollRes.ok) {
            clearInterval(pollInterval);
            setErrorMsg("Failed to check job status.");
            setLoading(false);
            return;
          }

          const job = await pollRes.json();

          if (job.progress) {
            setProgress(job.progress.detail);
            setProgressStage(job.progress.stage ?? null);
          }

          if (job.status === "complete") {
            clearInterval(pollInterval);
            setProgressStage("complete");
            onResults({
              leads: job.leads ?? [],
              keywords: job.keywords ?? [],
              diagnostics: job.diagnostics ?? {},
            });
            setLoading(false);
          } else if (job.status === "failed") {
            clearInterval(pollInterval);
            setErrorMsg(job.error || "Pipeline failed.");
            setLoading(false);
          }
        } catch {
          clearInterval(pollInterval);
          setErrorMsg("Lost connection to server.");
          setLoading(false);
        }
      }, 2000);

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label htmlFor="keywords" className="block mb-1.5 text-sm font-medium text-zinc-300">
          Keywords
        </label>
        <textarea
          id="keywords"
          {...register("keywords")}
          rows={6}
          placeholder={"plumber fort worth\nhvac dallas"}
          className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
        />
        {errors.keywords && (
          <p className="mt-1 text-xs text-red-400">{errors.keywords.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="location" className="block mb-1.5 text-sm font-medium text-zinc-300">
          Search Location Override <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="location"
          type="text"
          {...register("location")}
          placeholder="Granbury, Texas, United States"
          className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Leave blank for multi-city batches. The API will infer the city for each keyword from local results. Use this override for a single-market search.
        </p>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="performanceScore" className="block mb-1.5 text-sm font-medium text-zinc-300">
              Performance Score Threshold
            </label>
            <input id="performanceScore" type="number" {...register("performanceScore", { valueAsNumber: true })} className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.performanceScore && <p className="mt-1 text-xs text-red-400">{errors.performanceScore.message}</p>}
          </div>
          <div>
            <label htmlFor="lcp" className="block mb-1.5 text-sm font-medium text-zinc-300">LCP Threshold (ms)</label>
            <input id="lcp" type="number" {...register("lcp", { valueAsNumber: true })} className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.lcp && <p className="mt-1 text-xs text-red-400">{errors.lcp.message}</p>}
          </div>
          <div>
            <label htmlFor="cls" className="block mb-1.5 text-sm font-medium text-zinc-300">CLS Threshold</label>
            <input id="cls" type="number" step="0.01" {...register("cls", { valueAsNumber: true })} className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.cls && <p className="mt-1 text-xs text-red-400">{errors.cls.message}</p>}
          </div>
          <div>
            <label htmlFor="tbt" className="block mb-1.5 text-sm font-medium text-zinc-300">TBT Threshold (ms)</label>
            <input id="tbt" type="number" {...register("tbt", { valueAsNumber: true })} className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.tbt && <p className="mt-1 text-xs text-red-400">{errors.tbt.message}</p>}
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          These thresholds classify performance signals. Candidates are saved whether performance is strong, moderate, healthy, or unavailable.
        </p>
      </div>

      <div>
        <label htmlFor="maxDomains" className="block mb-1.5 text-sm font-medium text-zinc-300">Max Candidates to Screen</label>
        <input id="maxDomains" type="number" min={1} max={200} {...register("maxDomains", { valueAsNumber: true })} className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {errors.maxDomains && <p className="mt-1 text-xs text-red-400">{errors.maxDomains.message}</p>}
      </div>

      {errorMsg && <p className="rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-300">{errorMsg}</p>}

      {loading && (
        <ProgressMeter
          label="Lead search in progress"
          detail={progress ?? "Initializing pipeline…"}
          value={overallProgress(progressStage, progress)}
        />
      )}

      <button type="submit" disabled={loading} className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
        {loading ? "Running..." : "Run Lead Search"}
      </button>
    </form>
  );
}
