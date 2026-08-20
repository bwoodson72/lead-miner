"use client";

import { useCallback, useEffect, useState } from "react";

type DraftMessage = {
  id: number;
  kind: string;
  sequenceNumber: number;
  subject: string;
  bodyText: string;
  status: string;
  generatedAt: string;
};

type LeadDetail = {
  id: number;
  qualificationDecision: string | null;
  outreachMessages: DraftMessage[];
};

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { throw new Error(`Server returned a non-JSON response (${response.status})`); }
}

export default function LeadOutreachDraftControls({ leadId }: { leadId: string }) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/detail`, { cache: "no-store" });
      const body = await readJson(response) as { lead?: LeadDetail; error?: string };
      if (!response.ok || !body.lead) throw new Error(body.error ?? "Could not load outreach draft");
      setLead(body.lead);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [leadId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const draft = lead?.outreachMessages
    .filter((message) => message.kind === "initial" && ["draft", "approved"].includes(message.status))
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0] ?? null;

  async function regenerate() {
    if (!draft || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/outreach/${draft.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: instruction.trim() || null }),
      });
      const body = await readJson(response) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Draft regeneration failed");
      setInstruction("");
      setNotice("Outreach draft regenerated. The preview below is current.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!lead) {
    if (!error) return null;
    return <div className="border-b border-red-950 bg-red-950/20"><div className="mx-auto max-w-7xl px-4 py-2 text-xs text-red-300">Draft controls unavailable: {error}</div></div>;
  }

  if (!draft && lead.qualificationDecision !== "rebuild_candidate") return null;

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/95">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Outreach draft controls</div>
            <div className="mt-1 text-sm text-zinc-300">{draft ? <>Current initial draft · <span className="capitalize">{draft.status}</span> · {draft.subject}</> : "No unsent initial draft exists yet. Use Prepare outreach below to create one."}</div>
          </div>
          {draft && <button disabled={busy} onClick={regenerate} className="inline-flex items-center justify-center rounded bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-wait disabled:opacity-50">{busy ? "Regenerating…" : "Regenerate draft"}</button>}
        </div>

        {draft && <>
          <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} disabled={busy} maxLength={1000} rows={2} placeholder="Optional regeneration instruction, e.g. focus more on trust and the missing estimate path" className="mt-3 w-full resize-y rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-amber-600 disabled:opacity-50" />
          <div className="mt-3 rounded border border-zinc-800 bg-zinc-900 p-3">
            <div className="text-xs font-medium text-zinc-400">{draft.subject}</div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{draft.bodyText}</div>
          </div>
        </>}

        {notice && <div className="mt-3 text-xs text-emerald-300">{notice}</div>}
        {error && <div className="mt-3 text-xs text-red-300">{error}</div>}
      </div>
    </div>
  );
}
