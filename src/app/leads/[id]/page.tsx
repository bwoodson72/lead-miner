"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Problem = { id:number; category:string; title:string; evidence:string; businessConsequence:string; recommendedImprovement:string|null; confidence:number; outreachValue:string; createdAt:string };
type Score = { id:number; businessFit:number; websiteNeed:number; abilityToPay:number; contactability:number; urgency:number; salesOpportunity:number; compositeScore:number; model:string; researchVersion:string; createdAt:string };
type Message = { id:number; kind:string; sequenceNumber:number; subject:string; bodyText:string; angle:string|null; status:string; providerMessageId:string|null; providerThreadId:string|null; generatedAt:string; approvedAt:string|null; sentAt:string|null; sendAttemptedAt?:string|null; sendError?:string|null };
type Activity = { id:number; type:string; summary:string; metadata:Record<string,unknown>; createdAt:string };
type AIJob = { id:number; type:string; status:string; model:string; promptVersion:string; inputTokens:number|null; outputTokens:number|null; estimatedCost:number|null; error:string|null; startedAt:string|null; completedAt:string|null; createdAt:string };
type Suppression = { id:number; type:string; value:string; reason:string; createdAt:string };
type LeadDetail = {
  id:number; domain:string; businessName:string|null; landingPageUrl:string; keyword:string; adSource:string; lighthouseScore:number; lcp:number; cls:number|null; tbt:number|null;
  email:string|null; phone:string|null; address:string|null; contactPageUrl:string|null; enrichmentStatus:string|null; enrichmentNotes:string|null; isAgencyManaged:boolean; agencyName:string|null;
  isNationalChain:boolean; chainReason:string|null; status:string; qualificationDecision:string|null; qualificationReason:string|null; priorityScore:number|null; primaryOutreachAngle:string|null;
  researchSummary:string|null; researchVersion:string|null; lastResearchedAt:string|null; replyStatus:string|null; replySummary:string|null; lastReplyAt:string|null; outreachCount:number;
  firstContactAt:string|null; lastOutreachDate:string|null; followUpDate:string|null; notes:unknown; createdAt:string; updatedAt:string;
  problems:Problem[]; scores:Score[]; outreachMessages:Message[]; activities:Activity[]; aiJobs:AIJob[]; suppressions:Suppression[];
};

function fmt(value:string|null|undefined){ return value ? new Date(value).toLocaleString() : "—"; }
function pct(v:number){ return `${Math.round(v*100)}%`; }

export default function LeadDetailPage({ params }:{ params:Promise<{id:string}> }) {
  const [id,setId]=useState<string|null>(null); const [lead,setLead]=useState<LeadDetail|null>(null); const [error,setError]=useState<string|null>(null); const [loading,setLoading]=useState(true);
  const [revalidating,setRevalidating]=useState(false); const [contactMessage,setContactMessage]=useState<string|null>(null); const [contactError,setContactError]=useState<string|null>(null);
  useEffect(()=>{ params.then(p=>setId(p.id)); },[params]);
  useEffect(()=>{ if(!id) return; (async()=>{ try{ const res=await fetch(`/api/leads/${id}/detail`,{cache:"no-store"}); const data=await res.json(); if(!res.ok) throw new Error(data.error??"Failed to load lead"); setLead(data.lead); }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setLoading(false);} })(); },[id]);

  async function revalidateContact(){
    if(!lead) return;
    setRevalidating(true); setContactMessage(null); setContactError(null);
    try{
      const res=await fetch(`/api/leads/${lead.id}/enrich-email?force=true`,{method:"POST"});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error??"Contact revalidation failed");
      const detailRes=await fetch(`/api/leads/${lead.id}/detail`,{cache:"no-store"});
      const detailData=await detailRes.json();
      if(!detailRes.ok) throw new Error(detailData.error??"Failed to reload lead");
      setLead(detailData.lead);

      if(data.protected){
        setContactMessage("Existing contact data is not enrichment-sourced, so it was left unchanged.");
      }else{
        const results:string[]=[];
        if(data.identityChanged && data.email) results.push(`Enriched email was replaced with ${data.email} after identity verification.`);
        else if(data.identityChanged) results.push("Enriched email failed identity verification and was removed. Unsent outreach using the old email was cancelled.");
        else if(data.email) results.push(`Enriched email passed identity verification: ${data.email}.`);
        else results.push("No identity-verified email was found.");

        if(data.phoneIdentityChanged && data.phone) results.push(`Phone was replaced with ${data.phone} from an identity-matched local-business listing.`);
        else if(data.phoneRevalidated && data.phone) results.push(`Phone was revalidated against an identity-matched local-business listing: ${data.phone}.`);

        setContactMessage(results.join(" "));
      }
    }catch(e){ setContactError(e instanceof Error?e.message:String(e)); }
    finally{ setRevalidating(false); }
  }

  if(loading) return <main className="min-h-screen bg-zinc-950 p-8 text-zinc-300">Loading lead…</main>;
  if(error||!lead) return <main className="min-h-screen bg-zinc-950 p-8 text-red-300">{error??"Lead not found"}</main>;
  const latestScore=lead.scores[0];
  return <main className="min-h-screen bg-zinc-950 text-white"><div className="mx-auto max-w-6xl px-4 py-8">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs uppercase tracking-wider text-zinc-500">Lead #{lead.id}</div><h1 className="text-2xl font-bold">{lead.businessName||lead.domain}</h1><div className="mt-1 text-sm text-zinc-400">{lead.domain} · {lead.email??"No email"} · {lead.phone??"No phone"}</div></div><div className="flex gap-2"><Link href="/dashboard" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Dashboard</Link><a href={lead.landingPageUrl} target="_blank" rel="noreferrer" className="rounded bg-indigo-700 px-3 py-2 text-sm">Open website</a></div></div>

    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><div className="text-xs uppercase text-zinc-500">Status</div><div className="mt-1 font-semibold">{lead.status.replaceAll("_"," ")}</div></div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><div className="text-xs uppercase text-zinc-500">AI priority</div><div className="mt-1 text-xl font-bold">{lead.priorityScore??"—"}</div></div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><div className="text-xs uppercase text-zinc-500">Decision</div><div className="mt-1 font-semibold">{lead.qualificationDecision??"Not researched"}</div></div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><div className="text-xs uppercase text-zinc-500">Next follow-up</div><div className="mt-1 font-semibold">{fmt(lead.followUpDate)}</div></div>
    </div>

    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Research</h2><div className="mt-4 grid gap-5 md:grid-cols-2"><div><div className="text-xs uppercase tracking-wider text-zinc-500">Summary</div><p className="mt-2 leading-6 text-zinc-300">{lead.researchSummary??"No research summary yet."}</p><div className="mt-4 text-xs uppercase tracking-wider text-zinc-500">Qualification reason</div><p className="mt-2 text-sm leading-6 text-zinc-300">{lead.qualificationReason??"—"}</p><div className="mt-4 text-xs uppercase tracking-wider text-zinc-500">Primary outreach angle</div><p className="mt-2 text-sm leading-6 text-zinc-300">{lead.primaryOutreachAngle??"—"}</p></div><div><div className="text-xs uppercase tracking-wider text-zinc-500">Latest dimension scores</div>{latestScore?<div className="mt-2 grid grid-cols-2 gap-2 text-sm">{[["Business fit",latestScore.businessFit],["Website need",latestScore.websiteNeed],["Ability to pay",latestScore.abilityToPay],["Contactability",latestScore.contactability],["Urgency",latestScore.urgency],["Sales opportunity",latestScore.salesOpportunity]].map(([k,v])=><div key={String(k)} className="rounded bg-zinc-950 p-3"><div className="text-zinc-500">{k}</div><div className="mt-1 text-lg font-semibold">{v}</div></div>)}</div>:<p className="mt-2 text-zinc-500">No scores yet.</p>}<div className="mt-3 text-xs text-zinc-500">Last researched: {fmt(lead.lastResearchedAt)} · Version: {lead.researchVersion??"—"}</div></div></div></section>

    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Problems & evidence</h2><div className="mt-4 space-y-3">{lead.problems.length===0?<p className="text-zinc-500">No structured problems stored.</p>:lead.problems.map(p=><div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><div className="font-medium">{p.title}</div><div className="text-xs text-zinc-500">{p.category} · outreach {p.outreachValue}</div></div><div className="text-sm text-zinc-400">Confidence {pct(p.confidence)}</div></div><div className="mt-3 text-sm"><span className="text-zinc-500">Evidence:</span> <span className="text-zinc-300">{p.evidence}</span></div><div className="mt-2 text-sm"><span className="text-zinc-500">Business consequence:</span> <span className="text-zinc-300">{p.businessConsequence}</span></div>{p.recommendedImprovement&&<div className="mt-2 text-sm"><span className="text-zinc-500">Improvement:</span> <span className="text-zinc-300">{p.recommendedImprovement}</span></div>}</div>)}</div></section>

    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Outreach history</h2><div className="mt-4 space-y-4">{lead.outreachMessages.length===0?<p className="text-zinc-500">No outreach messages yet.</p>:lead.outreachMessages.map(m=><div key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div className="font-medium">{m.kind} · step {m.sequenceNumber}</div><div className="text-xs text-zinc-500">{m.status} · sent {fmt(m.sentAt)}</div></div><div className="mt-2 text-sm font-medium text-zinc-300">{m.subject}</div><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-400">{m.bodyText}</pre>{m.sendError&&<div className="mt-3 rounded bg-red-950/40 px-3 py-2 text-xs text-red-300">Send error: {m.sendError}</div>}<div className="mt-3 text-xs text-zinc-600">Provider message: {m.providerMessageId??"—"} · Thread: {m.providerThreadId??"—"}</div></div>)}</div></section>

    {lead.replyStatus&&<section className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/20 p-5"><h2 className="text-lg font-semibold text-emerald-300">Reply</h2><div className="mt-3 text-sm"><span className="text-zinc-500">Classification:</span> {lead.replyStatus}</div><p className="mt-2 leading-6 text-zinc-300">{lead.replySummary??"—"}</p><div className="mt-2 text-xs text-zinc-500">Last reply: {fmt(lead.lastReplyAt)}</div></section>}

    <div className="mb-6 grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">AI jobs</h2><div className="mt-4 space-y-2">{lead.aiJobs.length===0?<p className="text-zinc-500">No AI jobs.</p>:lead.aiJobs.map(j=><div key={j.id} className="rounded bg-zinc-950 p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-medium">{j.type}</span><span className="text-zinc-500">{j.status}</span></div><div className="mt-1 text-xs text-zinc-500">{j.model} · {j.promptVersion} · {fmt(j.createdAt)}</div>{(j.inputTokens!=null||j.outputTokens!=null)&&<div className="mt-1 text-xs text-zinc-500">Tokens: {j.inputTokens??0} in / {j.outputTokens??0} out · Cost {j.estimatedCost!=null?`$${j.estimatedCost.toFixed(4)}`:"—"}</div>}{j.error&&<div className="mt-2 text-xs text-red-300">{j.error}</div>}</div>)}</div></section><section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Contact & source</h2>{(lead.email||lead.phone)&&<button type="button" onClick={revalidateContact} disabled={revalidating} className="rounded border border-amber-700 bg-amber-950/40 px-3 py-2 text-xs font-medium text-amber-200 disabled:cursor-not-allowed disabled:opacity-50">{revalidating?"Revalidating…":"Revalidate enriched contact"}</button>}</div>{contactMessage&&<div className="mt-3 rounded border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">{contactMessage}</div>}{contactError&&<div className="mt-3 rounded border border-red-900 bg-red-950/30 px-3 py-2 text-xs text-red-300">{contactError}</div>}<div className="mt-4 space-y-2 text-sm text-zinc-300"><div>{lead.email??"No email"}</div><div>{lead.phone??"No phone"}</div><div>{lead.address??"No address"}</div><div>Keyword: {lead.keyword}</div><div>Source: {lead.adSource}</div><div>Enrichment: {lead.enrichmentStatus??"—"}</div>{lead.isAgencyManaged&&<div className="text-orange-300">Agency managed: {lead.agencyName??"detected"}</div>}{lead.isNationalChain&&<div className="text-red-300">National chain: {lead.chainReason??"detected"}</div>}{lead.suppressions.length>0&&<div className="mt-4"><div className="text-xs uppercase text-zinc-500">Suppressions</div>{lead.suppressions.map(s=><div key={s.id} className="mt-1 text-red-300">{s.type}: {s.reason}</div>)}</div>}</div></section></div>

    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Activity timeline</h2><div className="mt-4 space-y-3">{lead.activities.length===0?<p className="text-zinc-500">No activity yet.</p>:lead.activities.map(a=><div key={a.id} className="border-l border-zinc-700 pl-4"><div className="text-sm font-medium text-zinc-200">{a.summary}</div><div className="mt-1 text-xs text-zinc-500">{a.type} · {fmt(a.createdAt)}</div></div>)}</div></section>
  </div></main>;
}
