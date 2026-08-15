"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  autoResearch: boolean; autoDraftOutreach: boolean; approvalMode: "manual" | "shadow" | "auto_safe";
  researchModel: string; outreachModel: string; researchInstructions: string; outreachInstructions: string; followUpInstructions: string; replyInstructions: string;
  researchBatchSize: number; minAutoApprovePriority: number; minAutoApproveConfidence: number; minProblemConfidence: number;
  dailySendLimit: number; sendWindowStart: string; sendWindowEnd: string; followUpDelaysDays: number[]; senderName: string; senderEmail: string; emailProvider: "resend" | "gmail";
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null); const [saving, setSaving] = useState(false); const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { fetch("/api/settings", { cache: "no-store" }).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Failed to load settings"); setSettings({ ...data, followUpDelaysDays: Array.isArray(data.followUpDelaysDays) ? data.followUpDelaysDays : [4,6,10] }); }).catch((e) => setMessage(e instanceof Error ? e.message : String(e))); }, []);
  async function save() { if (!settings) return; setSaving(true); setMessage(null); try { const res = await fetch("/api/settings", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(settings) }); const data=await res.json(); if(!res.ok) throw new Error(data.error??"Failed to save settings"); setSettings({...data,followUpDelaysDays:Array.isArray(data.followUpDelaysDays)?data.followUpDelaysDays:settings.followUpDelaysDays}); setMessage("Settings saved."); } catch(e){setMessage(e instanceof Error?e.message:String(e));} finally{setSaving(false);} }
  if(!settings) return <main className="min-h-screen bg-zinc-950 p-8 text-zinc-300">{message??"Loading settings..."}</main>;
  const numberField=(key:keyof Settings,label:string,step=1)=><label className="block text-sm text-zinc-300">{label}<input type="number" step={step} value={settings[key] as number} onChange={(e)=>setSettings({...settings,[key]:Number(e.target.value)})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"/></label>;
  return <main className="min-h-screen bg-zinc-950 text-white"><div className="mx-auto max-w-4xl px-4 py-8">
    <div className="mb-8 flex items-center justify-between"><div><h1 className="text-2xl font-bold">Settings</h1><p className="mt-1 text-sm text-zinc-400">Runtime behavior and editable AI instructions are stored in PostgreSQL and take effect without a redeploy.</p></div><div className="flex gap-2"><Link href="/dashboard" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Dashboard</Link><Link href="/outreach" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Outreach</Link></div></div>
    {message&&<div className="mb-4 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">{message}</div>}
    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="mb-4 font-semibold">Automation</h2><div className="grid gap-4 md:grid-cols-2">
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.autoResearch} onChange={(e)=>setSettings({...settings,autoResearch:e.target.checked})}/>Automatically research new leads</label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.autoDraftOutreach} onChange={(e)=>setSettings({...settings,autoDraftOutreach:e.target.checked})}/>Automatically generate outreach drafts</label>
      <label className="block text-sm">Approval mode<select value={settings.approvalMode} onChange={(e)=>setSettings({...settings,approvalMode:e.target.value as Settings["approvalMode"]})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"><option value="manual">Manual</option><option value="shadow">Shadow</option><option value="auto_safe">Auto-approve safe drafts</option></select></label>{numberField("researchBatchSize","Manual/backfill research batch size")}
    </div></section>
    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="mb-4 font-semibold">AI Models & Instructions</h2><div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm">Research model<input value={settings.researchModel} onChange={(e)=>setSettings({...settings,researchModel:e.target.value})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"/></label>
      <label className="block text-sm">Outreach / follow-up model<input value={settings.outreachModel} onChange={(e)=>setSettings({...settings,outreachModel:e.target.value})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"/></label>{numberField("minProblemConfidence","Minimum problem confidence",0.01)}{numberField("minAutoApproveConfidence","Minimum auto-approval confidence",0.01)}{numberField("minAutoApprovePriority","Minimum auto-approval priority")}
    </div>
    <div className="mt-5 space-y-4">
      <label className="block text-sm">Research instructions<textarea rows={7} value={settings.researchInstructions} onChange={(e)=>setSettings({...settings,researchInstructions:e.target.value})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 leading-6 text-white"/></label>
      <label className="block text-sm">Outreach instructions<textarea rows={7} value={settings.outreachInstructions} onChange={(e)=>setSettings({...settings,outreachInstructions:e.target.value})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 leading-6 text-white"/></label>
      <label className="block text-sm">Follow-up instructions<textarea rows={8} value={settings.followUpInstructions} onChange={(e)=>setSettings({...settings,followUpInstructions:e.target.value})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 leading-6 text-white"/><span className="mt-1 block text-xs text-zinc-500">Controls how each sequence step continues the existing thread. Evidence and anti-invention rules remain enforced in code.</span></label>
      <label className="block text-sm">Reply classification instructions<textarea rows={6} value={settings.replyInstructions} onChange={(e)=>setSettings({...settings,replyInstructions:e.target.value})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 leading-6 text-white"/><span className="mt-1 block text-xs text-zinc-500">Controls classification and recommended action. Lead Miner does not automatically answer interested prospects.</span></label>
    </div></section>
    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="mb-4 font-semibold">Sending & Follow-ups</h2><div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm">Email provider<select value={settings.emailProvider} onChange={(e)=>setSettings({...settings,emailProvider:e.target.value as Settings["emailProvider"]})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"><option value="resend">Resend</option><option value="gmail">Gmail / Google Workspace</option></select><span className="mt-1 block text-xs text-zinc-500">Gmail is required for automatic thread reply detection.</span></label>
      <label className="block text-sm">Sender name<input value={settings.senderName} onChange={(e)=>setSettings({...settings,senderName:e.target.value})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"/></label>
      <label className="block text-sm">Sender email<input type="email" value={settings.senderEmail} onChange={(e)=>setSettings({...settings,senderEmail:e.target.value})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"/></label>
      {numberField("dailySendLimit","Daily send limit")}
      <label className="block text-sm">Send window start<input type="time" value={settings.sendWindowStart} onChange={(e)=>setSettings({...settings,sendWindowStart:e.target.value})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"/></label>
      <label className="block text-sm">Send window end<input type="time" value={settings.sendWindowEnd} onChange={(e)=>setSettings({...settings,sendWindowEnd:e.target.value})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"/></label>
      <label className="block text-sm">Follow-up delays (days, comma separated)<input value={settings.followUpDelaysDays.join(", ")} onChange={(e)=>setSettings({...settings,followUpDelaysDays:e.target.value.split(",").map(v=>Number(v.trim())).filter(v=>Number.isInteger(v)&&v>0)})} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"/></label>
    </div></section>
    <button disabled={saving} onClick={save} className="rounded bg-indigo-600 px-5 py-2.5 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50">{saving?"Saving...":"Save settings"}</button>
  </div></main>;
}
