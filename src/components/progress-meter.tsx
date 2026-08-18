"use client";

export type ProgressMeterProps = {
  label: string;
  detail?: string | null;
  value?: number | null;
  processed?: number | null;
  total?: number | null;
  succeeded?: number | null;
  failed?: number | null;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function ProgressMeter({ label, detail, value, processed, total, succeeded, failed }: ProgressMeterProps) {
  const derived = value ?? (typeof processed === "number" && typeof total === "number" && total > 0 ? (processed / total) * 100 : null);
  const percent = derived == null ? null : clamp(derived);

  return (
    <div className="rounded-lg border border-indigo-800/70 bg-indigo-950/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="font-medium text-indigo-200">{label}</div>
        <div className="text-xs tabular-nums text-zinc-400">
          {percent != null ? `${Math.round(percent)}%` : "Working…"}
          {typeof processed === "number" && typeof total === "number" && total > 0 ? ` · ${processed}/${total}` : ""}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        {percent == null ? (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-indigo-500" />
        ) : (
          <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-300" style={{ width: `${percent}%` }} />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
        <span>{detail ?? "Process is running."}</span>
        {(typeof succeeded === "number" || typeof failed === "number") && (
          <span className="tabular-nums">
            {typeof succeeded === "number" ? `${succeeded} succeeded` : ""}
            {typeof succeeded === "number" && typeof failed === "number" ? " · " : ""}
            {typeof failed === "number" ? `${failed} failed` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
