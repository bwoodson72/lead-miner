"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeywordInputSchema, type KeywordInput, type LeadRecord } from "@/lib/schemas";

interface KeywordFormProps {
  onResults: (leads: LeadRecord[]) => void;
}

export default function KeywordForm({ onResults }: KeywordFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    try {
      const res = await fetch("/api/run-lead-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error ?? "An unexpected error occurred.");
      } else {
        onResults(json.leads);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Keywords */}
      <div>
        <label className="block mb-1.5 text-sm font-medium text-zinc-300">
          Keywords
        </label>
        <textarea
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
          <label className="block mb-1.5 text-sm font-medium text-zinc-300">
            Min Performance Score
          </label>
          <input
            type="number"
            {...register("performanceScore", { valueAsNumber: true })}
            className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.performanceScore && (
            <p className="mt-1 text-xs text-red-400">{errors.performanceScore.message}</p>
          )}
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-medium text-zinc-300">
            LCP Threshold (ms)
          </label>
          <input
            type="number"
            {...register("lcp", { valueAsNumber: true })}
            className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.lcp && (
            <p className="mt-1 text-xs text-red-400">{errors.lcp.message}</p>
          )}
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-medium text-zinc-300">
            CLS Threshold
          </label>
          <input
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
          <label className="block mb-1.5 text-sm font-medium text-zinc-300">
            TBT Threshold (ms)
          </label>
          <input
            type="number"
            {...register("tbt", { valueAsNumber: true })}
            className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.tbt && (
            <p className="mt-1 text-xs text-red-400">{errors.tbt.message}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block mb-1.5 text-sm font-medium text-zinc-300">
          Report Email
        </label>
        <input
          type="text"
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
