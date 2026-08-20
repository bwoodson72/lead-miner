"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProgressMeter from "@/components/progress-meter";

type ImportRow = {
  website: string;
  businessName?: string | null;
  keyword?: string | null;
  city?: string | null;
  region?: string | null;
  myNotes?: string | null;
};

type PreviewRow = {
  rowNumber: number;
  website: string;
  normalizedUrl: string | null;
  domain: string | null;
  status: "ready" | "existing" | "duplicate" | "invalid" | "franchise";
  reason: string | null;
  existingLeadId: number | null;
  data: ImportRow;
};

type Preview = {
  rows: PreviewRow[];
  summary: { total: number; ready: number; existing: number; duplicate: number; invalid: number; franchise: number };
};

type ImportBatch = {
  id: number;
  source: "manual_url" | "csv_import";
  fileName: string | null;
  status: string;
  totalRows: number;
  readyRows: number;
  createdLeads: number;
  existingRows: number;
  duplicateRows: number;
  invalidRows: number;
  franchiseRows: number;
  screenedLeads: number;
  screeningFailures: number;
  createdAt: string;
  completedAt: string | null;
  pipeline: { total: number; researched: number; rebuildCandidates: number; hasEmail: number; outreachReady: number };
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; continue; }
      if (char === '"') { quoted = false; continue; }
      field += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ",") { row.push(field); field = ""; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    if (char !== "\r") field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((values) => values.some((value) => value.trim()));
}

function csvRows(text: string): ImportRow[] {
  const parsed = parseCsv(text);
  if (!parsed.length) throw new Error("The CSV is empty.");
  const headers = parsed[0]!.map((value) => value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const websiteIndex = headers.indexOf("website");
  if (websiteIndex < 0) throw new Error("The CSV needs a website column.");
  const optional = (name: string) => headers.indexOf(name);
  const businessNameIndex = optional("business_name");
  const keywordIndex = optional("keyword");
  const cityIndex = optional("city");
  const regionIndex = optional("region");
  const myNotesIndex = optional("my_notes");
  const value = (values: string[], index: number) => index >= 0 ? values[index]?.trim() || null : null;
  const rows = parsed.slice(1).map((values) => ({
    website: values[websiteIndex]?.trim() ?? "",
    businessName: value(values, businessNameIndex),
    keyword: value(values, keywordIndex),
    city: value(values, cityIndex),
    region: value(values, regionIndex),
    myNotes: value(values, myNotesIndex),
  })).filter((row) => row.website);
  if (!rows.length) throw new Error("The CSV contains no website rows.");
  if (rows.length > 1000) throw new Error("CSV imports are limited to 1,000 rows at a time.");
  return rows;
}

function sourceLabel(source: ImportBatch["source"]) {
  return source === "csv_import" ? "CSV" : "Single URL";
}

export default function ImportWebsites() {
  const [singleUrl, setSingleUrl] = useState("");
  const [singleNotes, setSingleNotes] = useState("");
  const [singleBusy, setSingleBusy] = useState(false);
  const [singleResult, setSingleResult] = useState<Preview | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<ImportRow[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [jobProgress, setJobProgress] = useState<{ stage: string; detail: string } | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadHistory() {
    const res = await fetch("/api/imports?limit=10", { cache: "no-store" });
    if (!res.ok) return;
    const body = await res.json();
    setBatches(body.batches ?? []);
  }

  useEffect(() => { void loadHistory(); }, []);

  async function requestPreview(rows: ImportRow[], source: "manual_url" | "csv_import", fileName?: string | null) {
    const res = await fetch("/api/imports/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, fileName: fileName ?? null, rows }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Import preview failed");
    return body as Preview;
  }

  async function startImport(rows: ImportRow[], source: "manual_url" | "csv_import", fileName?: string | null) {
    const res = await fetch("/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, fileName: fileName ?? null, rows }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Website import failed");
    if (!body.jobId) {
      setNotice(body.message ?? "No new candidates to import.");
      await loadHistory();
      return;
    }
    setJobProgress({ stage: "starting", detail: "Initializing website import…" });
    await new Promise<void>((resolve, reject) => {
      const timer = window.setInterval(async () => {
        try {
          const poll = await fetch(`/api/jobs/${body.jobId}`, { cache: "no-store" });
          const job = await poll.json();
          if (!poll.ok) throw new Error(job.error ?? "Could not check import status");
          if (job.progress) setJobProgress(job.progress);
          if (job.status === "complete") {
            window.clearInterval(timer);
            setNotice(job.progress?.detail ?? "Website import complete.");
            await loadHistory();
            resolve();
          } else if (job.status === "failed") {
            window.clearInterval(timer);
            reject(new Error(job.error ?? "Website import failed"));
          }
        } catch (e) {
          window.clearInterval(timer);
          reject(e);
        }
      }, 1500);
    });
  }

  async function addSingle() {
    if (!singleUrl.trim() || singleBusy) return;
    setSingleBusy(true); setError(null); setNotice(null); setSingleResult(null);
    const rows: ImportRow[] = [{ website: singleUrl.trim(), myNotes: singleNotes.trim() || null }];
    try {
      const checked = await requestPreview(rows, "manual_url");
      setSingleResult(checked);
      if (checked.summary.ready === 1) {
        await startImport(rows, "manual_url");
        setSingleUrl(""); setSingleNotes("");
      } else if (checked.summary.existing === 1) {
        setNotice("That website is already in Lead Miner.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSingleBusy(false); setJobProgress(null); }
  }

  async function chooseCsv(file: File | null) {
    setError(null); setNotice(null); setPreview(null); setCsvData([]); setCsvFileName(null);
    if (!file) return;
    setPreviewBusy(true);
    try {
      const rows = csvRows(await file.text());
      const checked = await requestPreview(rows, "csv_import", file.name);
      setCsvData(rows); setCsvFileName(file.name); setPreview(checked);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setPreviewBusy(false); }
  }

  async function importCsv() {
    if (!csvData.length || !preview?.summary.ready || importBusy) return;
    setImportBusy(true); setError(null); setNotice(null);
    try {
      await startImport(csvData, "csv_import", csvFileName);
      setPreview(null); setCsvData([]); setCsvFileName(null);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setImportBusy(false); setJobProgress(null); }
  }

  const previewRows = useMemo(() => preview?.rows.slice(0, 100) ?? [], [preview]);

  return <div className="space-y-8">
    {notice && <div className="rounded border border-emerald-800 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
    {error && <div className="rounded border border-red-800 bg-red-950/35 px-4 py-3 text-sm text-red-300">{error}</div>}

    <section>
      <h2 className="font-semibold text-white">Add one website</h2>
      <p className="mt-1 text-sm text-zinc-400">Add a domain directly. Lead Miner will save it as a candidate, screen the site, and let the normal research queue qualify it.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input value={singleUrl} onChange={(e) => setSingleUrl(e.target.value)} placeholder="examplecontractor.com" className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600" />
        <button disabled={singleBusy || !singleUrl.trim()} onClick={addSingle} className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50">{singleBusy ? "Adding…" : "Add & Qualify"}</button>
      </div>
      <textarea value={singleNotes} maxLength={5000} rows={3} onChange={(e) => setSingleNotes(e.target.value)} placeholder="My Notes (optional) — used for later outreach writing, not qualification" className="mt-3 w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600" />
      {singleResult?.rows[0]?.status === "existing" && singleResult.rows[0].existingLeadId && <div className="mt-3 text-sm text-amber-300">Already exists — <Link className="underline" href={`/leads/${singleResult.rows[0].existingLeadId}`}>Lead #{singleResult.rows[0].existingLeadId}</Link></div>}
    </section>

    <section className="border-t border-zinc-800 pt-7">
      <h2 className="font-semibold text-white">Import a CSV</h2>
      <p className="mt-1 text-sm text-zinc-400">Required column: <code>website</code>. Optional: <code>business_name</code>, <code>keyword</code>, <code>city</code>, <code>region</code>, <code>my_notes</code>. A generic <code>notes</code> column is intentionally ignored.</p>
      <input type="file" accept=".csv,text/csv" disabled={previewBusy || importBusy} onChange={(e) => void chooseCsv(e.target.files?.[0] ?? null)} className="mt-4 block w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-zinc-300" />
      {previewBusy && <div className="mt-4 text-sm text-zinc-400">Validating CSV…</div>}

      {preview && <div className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {[["Rows", preview.summary.total], ["Ready", preview.summary.ready], ["Existing", preview.summary.existing], ["Duplicates", preview.summary.duplicate], ["Invalid", preview.summary.invalid], ["Franchises", preview.summary.franchise]].map(([label, value]) => <div key={String(label)} className="rounded border border-zinc-800 bg-zinc-950 p-3"><div className="text-xl font-semibold">{value}</div><div className="text-xs text-zinc-500">{label}</div></div>)}
        </div>
        <div className="max-h-80 overflow-auto rounded border border-zinc-800">
          <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-zinc-950 text-zinc-500"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Website</th><th className="px-3 py-2">Domain</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Detail</th></tr></thead><tbody className="divide-y divide-zinc-800">{previewRows.map((row) => <tr key={row.rowNumber}><td className="px-3 py-2">{row.rowNumber}</td><td className="px-3 py-2">{row.website}</td><td className="px-3 py-2">{row.domain ?? "—"}</td><td className="px-3 py-2 capitalize">{row.status}</td><td className="px-3 py-2 text-zinc-500">{row.existingLeadId ? <Link className="underline" href={`/leads/${row.existingLeadId}`}>Lead #{row.existingLeadId}</Link> : row.reason ?? "Ready to import"}</td></tr>)}</tbody></table>
        </div>
        {preview.rows.length > previewRows.length && <div className="text-xs text-zinc-500">Showing the first {previewRows.length} of {preview.rows.length} rows.</div>}
        <button disabled={importBusy || preview.summary.ready === 0} onClick={importCsv} className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50">{importBusy ? "Importing…" : `Import ${preview.summary.ready} candidate${preview.summary.ready === 1 ? "" : "s"}`}</button>
      </div>}
    </section>

    {jobProgress && <ProgressMeter label="Website import in progress" detail={jobProgress.detail} />}

    <section className="border-t border-zinc-800 pt-7">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Recent imports</h2><p className="mt-1 text-sm text-zinc-500">Batch IDs can be used from the dashboard filter.</p></div><button onClick={() => void loadHistory()} className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Refresh</button></div>
      <div className="mt-4 space-y-2">{batches.length ? batches.map((batch) => <div key={batch.id} className="rounded border border-zinc-800 bg-zinc-950 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-medium">Batch #{batch.id} · {sourceLabel(batch.source)}{batch.fileName ? ` · ${batch.fileName}` : ""}</div><div className="text-xs capitalize text-zinc-500">{batch.status}</div></div><div className="mt-2 text-xs text-zinc-500">{batch.createdLeads} added · {batch.existingRows} existing · {batch.duplicateRows} duplicate · {batch.invalidRows} invalid · {batch.franchiseRows} franchise · {batch.pipeline.researched} researched · {batch.pipeline.rebuildCandidates} rebuild candidates</div></div>) : <div className="text-sm text-zinc-500">No imports yet.</div>}</div>
    </section>
  </div>;
}
