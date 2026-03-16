"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeywordInputSchema, type KeywordInput, type LeadRecord } from "@/lib/schemas";
import { getApiUrl } from "@/lib/env";

interface ResultsData {
  leads: LeadRecord[];
  keywords: string[];
  diagnostics: Record<string, unknown>;
}

interface KeywordFormProps {
  onResults: (data: ResultsData) => void;
}

export default function KeywordForm({ onResults }: KeywordFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

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
    },
  });

  async function onSubmit(data: KeywordInput) {
    setLoading(true);
    setErrorMsg(null);
    setProgress(null);

    const apiUrl = getApiUrl();

    try {
      // Start the job
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

      // Poll for results
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

          // Update progress display
          if (job.progress) {
            setProgress(job.progress.detail);
          }

          if (job.status === "complete") {
            clearInterval(pollInterval);
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
        } catch (err) {
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
      {/* Keywords */}
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

      {/* Threshold grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label htmlFor="performanceScore" className="block mb-1.5 text-sm font-medium text-zinc-300">
            Min Performance Score
          </label>
          <input
            id="performanceScore"
            type="number"
            {...register("performanceScore", { valueAsNumber: true })}
            className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.performanceScore && (
            <p className="mt-1 text-xs text-red-400">{errors.performanceScore.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="lcp" className="block mb-1.5 text-sm font-medium text-zinc-300">
            LCP Threshold (ms)
          </label>
          <input
            id="lcp"
            type="number"
            {...register("lcp", { valueAsNumber: true })}
            className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.lcp && (
            <p className="mt-1 text-xs text-red-400">{errors.lcp.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="cls" className="block mb-1.5 text-sm font-medium text-zinc-300">
            CLS Threshold
          </label>
          <input
            id="cls"
            type="number"
            step="0.01"
            {...register("cls", { valueAsNumber: true })}
            className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.cls && (
            <p className="mt-1 text-xs text-red-400">{errors.cls.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="tbt" className="block mb-1.5 text-sm font-medium text-zinc-300">
            TBT Threshold (ms)
          </label>
          <input
            id="tbt"
            type="number"
            {...register("tbt", { valueAsNumber: true })}
            className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.tbt && (
            <p className="mt-1 text-xs text-red-400">{errors.tbt.message}</p>
          )}
        </div>
      </div>

      {/* Max Domains */}
      <div>
        <label htmlFor="maxDomains" className="block mb-1.5 text-sm font-medium text-zinc-300">
          Max Domains to Analyze
        </label>
        <input
          id="maxDomains"
          type="number"
          min={1}
          max={50}
          {...register("maxDomains", { valueAsNumber: true })}
          className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.maxDomains && (
          <p className="mt-1 text-xs text-red-400">{errors.maxDomains.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block mb-1.5 text-sm font-medium text-zinc-300">
          Report Email
        </label>
        <input
          id="email"
          type="email"
          {...register("email")}
          placeholder="you@example.com"
          className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-300">
          {errorMsg}
        </p>
      )}

      {loading && progress && (
        <div className="rounded-md bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-zinc-300">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span>{progress}</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Running..." : "Run Lead Search"}
      </button>
    </form>
  );
}
