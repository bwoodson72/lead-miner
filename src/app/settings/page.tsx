"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DEFAULT_FOLLOW_UP_DELAYS = [4, 6, 10, 14];

type Settings = {
  autoResearch: boolean; autoDraftOutreach: boolean; approvalMode: "manual" | "shadow" | "auto_safe";
  researchModel: string; outreachModel: string; researchInstructions: string; outreachInstructions: string; followUpInstructions: string; replyInstructions: string;
  researchBatchSize: number; minAutoApprovePriority: number; minAutoApproveConfidence: number; minProblemConfidence: number;
  dailySendLimit: number; sendWindowStart: string; sendWindowEnd: string; followUpDelaysDays: number[]; senderName: string; senderEmail: string;
};

type SaveSection = "automation" | "ai" | "sending";

function normalizeFollowUpDelays(value: unknown) {
  const delays = Array.isArray(value) ? value : [];
  return DEFAULT_FOLLOW_UP_DELAYS.map((fallback, index) => {
    const candidate = Number(delays[index]);
    return Number.isInteger(candidate) && candidate > 0 ? candidate : fallback;
  });
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState<SaveSection | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/settings", { cache: "no-store" });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.error ?? "Failed to load settings");
    const canonical = { ...data, followUpDelaysDays: normalizeFollowUpDelays(data.followUpDelaysDays) } as Settings;
    setSettings(canonical);
    return canonical;
  }

  useEffect(() => { load().catch((e) => setMessage(e instanceof Error ? e.message : String(e))); }, []);

  async function saveSection(section: SaveSection) {
    if (!settings) return;
    setSaving(section); setMessage(null);

    const payload: Partial<Settings> = section === "automation" ? {
      autoResearch: settings.autoResearch,
      autoDraftOutreach: settings.autoDraftOutreach,
      approvalMode: settings.approvalMode,
      researchBatchSize: settings.researchBatchSize,
    } : section === "ai" ? {
      researchModel: settings.researchModel,
      outreachModel: settings.outreachModel,
      minProblemConfidence: settings.minProblemConfidence,
      minAutoApproveConfidence: settings.minAutoApproveConfidence,
      minAutoApprovePriority: settings.minAutoApprovePriority,
      researchInstructions: settings.researchInstructions,
      outreachInstructions: settings.outreachInstructions,
      followUpInstructions: settings.followUpInstructions,
      replyInstructions: settings.replyInstructions,
    } : {
      senderName: settings.senderName,
      senderEmail: settings.senderEmail,
      dailySendLimit: settings.dailySendLimit,
      sendWindowStart: settings.sendWindowStart,
      sendWindowEnd: settings.sendWindowEnd,
      followUpDelaysDays: settings.followUpDelaysDays,
    };

    try {
      const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.issues?.map((i: { path?: (string | number)[]; message?: string }) => `${i.path?.join(".")}: ${i.message}`).join("; ") || data.error || "Failed to save settings");

      const canonical = await load();
      const mismatch = Object.keys(payload).find((key) => {
        const expected = payload[key as keyof Settings];
        const actual = canonical[key as keyof Settings];
        return JSON.stringify(expected) !== JSON.stringify(actual);
      });
      if (mismatch) throw new Error(`Database read-back did not match ${mismatch}.`);
      setMessage(`${section === "ai" ? "AI" : section === "sending" ? "Sending" : "Automation"} settings saved and verified.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(null); }
  }

  if (!settings) return <main className="min-h-screen bg-zinc-950 p-8 text-zinc-300">{message ?? "Loading settings..."}</main>;
  const numberField = (key: keyof Settings, label: string, step = 1) => <label className="block text-sm text-zinc-300">{label}<input type="number" step={step} value={settings[key] as number} onChange={(e) => setSettings({ ...settings, [key]: Number(e.target.value) })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-white" /></label>;
  const updateFollowUpDelay = (index: number, value: number) => {
    const next = [...settings.followUpDelaysDays];
    next[index] = value;
    setSettings({ ...settings, followUpDelaysDays: next });
  };

  return <main className="min-h-screen bg-zinc-950 text-white"><div className="mx-auto max-w-4xl px-4 py-8">
    <div className="mb-8 flex items-center justify-between"><div><h1 className="text-2xl font-bold">Settings</h1><p className="mt-1 text-sm text-zinc-400">Each section saves independently and is verified against PostgreSQL.</p></div><div className="flex gap-2"><Link href="/dashboard" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Dashboard</Link><Link href="/outreach" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Outreach</Link></div></div>
    {message && <div className="mb-4 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">{message}</div>}

    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="mb-4 font-semibold">Automation</h2><div className="grid gap-4 md:grid-cols-2">
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.autoResearch} onChange={(e) => setSettings({ ...settings, autoResearch: e.target.checked })} />Automatically research new leads</label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.autoDraftOutreach} onChange={(e) => setSettings({ ...settings, autoDraftOutreach: e.target.checked })} />Automatically generate outreach drafts</label>
      <label className="block text-sm">Approval mode<select value={settings.approvalMode} onChange={(e) => setSettings({ ...settings, approvalMode: e.target.value as Settings["approvalMode"] })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"><option value="manual">Manual</option><option value="shadow">Shadow</option><option value="auto_safe">Auto-approve safe drafts</option></select></label>
      {numberField("researchBatchSize", "Manual/backfill research batch size")}
    </div><button disabled={saving !== null} onClick={() => saveSection("automation")} className="mt-5 rounded bg-indigo-700 px-4 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">{saving === "automation" ? "Saving..." : "Save automation settings"}</button></section>

    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="mb-4 font-semibold">AI Models & Instructions</h2><div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm">Research model<input value={settings.researchModel} onChange={(e) => setSettings({ ...settings, researchModel: e.target.value })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
      <label className="block text-sm">Outreach / follow-up model<input value={settings.outreachModel} onChange={(e) => setSettings({ ...settings, outreachModel: e.target.value })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
      {numberField("minProblemConfidence", "Minimum problem confidence", 0.01)}{numberField("minAutoApproveConfidence", "Minimum auto-approval confidence", 0.01)}{numberField("minAutoApprovePriority", "Minimum auto-approval priority")}
    </div><div className="mt-5 space-y-4">
      <label className="block text-sm">Research instructions<textarea rows={7} value={settings.researchInstructions} onChange={(e) => setSettings({ ...settings, researchInstructions: e.target.value })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 leading-6 text-white" /></label>
      <label className="block text-sm">Outreach instructions<textarea rows={7} value={settings.outreachInstructions} onChange={(e) => setSettings({ ...settings, outreachInstructions: e.target.value })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 leading-6 text-white" /></label>
      <label className="block text-sm">Follow-up instructions<textarea rows={8} value={settings.followUpInstructions} onChange={(e) => setSettings({ ...settings, followUpInstructions: e.target.value })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 leading-6 text-white" /></label>
      <label className="block text-sm">Reply classification instructions<textarea rows={6} value={settings.replyInstructions} onChange={(e) => setSettings({ ...settings, replyInstructions: e.target.value })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 leading-6 text-white" /></label>
      <button disabled={saving !== null} onClick={() => saveSection("ai")} className="rounded bg-indigo-700 px-4 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">{saving === "ai" ? "Saving..." : "Save AI settings"}</button>
    </div></section>

    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="mb-1 font-semibold">Gmail Sending & Follow-ups</h2><p className="mb-4 text-sm text-zinc-400">Each outreach sequence has one initial email and exactly four follow-ups. Follow-up 4 is the terminal breakup message.</p><div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm">Sender name<input value={settings.senderName} onChange={(e) => setSettings({ ...settings, senderName: e.target.value })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
      <label className="block text-sm">Sender email<input type="email" value={settings.senderEmail} onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
      {numberField("dailySendLimit", "Daily send limit")}
      <label className="block text-sm">Send window start<input type="time" value={settings.sendWindowStart} onChange={(e) => setSettings({ ...settings, sendWindowStart: e.target.value })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
      <label className="block text-sm">Send window end<input type="time" value={settings.sendWindowEnd} onChange={(e) => setSettings({ ...settings, sendWindowEnd: e.target.value })} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
      <div className="md:col-span-2"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{settings.followUpDelaysDays.map((delay, index) => <label key={index} className="block text-sm">{index === 3 ? "Follow-up 4 breakup (days)" : `Follow-up ${index + 1} (days)`}<input type="number" min={1} max={90} step={1} value={delay} onChange={(e) => updateFollowUpDelay(index, Number(e.target.value))} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>)}</div></div>
    </div><button disabled={saving !== null} onClick={() => saveSection("sending")} className="mt-5 rounded bg-indigo-700 px-4 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">{saving === "sending" ? "Saving..." : "Save sending settings"}</button></section>
  </div></main>;
}
