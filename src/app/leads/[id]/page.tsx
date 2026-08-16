"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Problem = { id:number; category:string; title:string; evidence:string; businessConsequence:string; recommendedImprovement:string|null; confidence:number; outreachValue:string; createdAt:string };
type Score = { id:number; businessFit:number; websiteNeed:number; abilityToPay:number; contactability:number; urgency:number; salesOpportunity:number; compositeScore:number; model:string; researchVersion:string; createdAt:string };
type Message = { id:number; kind:string; sequenceNumber:number; subject:string; bodyText:string; angle:string|null; status:string; providerMessageId:string|null; providerThreadId:string|null; generatedAt:string; approvedAt:string|null; sentAt:string|null; sendAttemptedAt?:string|null; sendError?:string|null };
type Activity = { id:number; type:string; summary:string; metadata:Record<string,unknown>; createdAt:string };
type AIJob = { id:number; type:string; status:string; model:string; promptVersion:string; inputTokens:number|null; outputTokens:number|null; estimatedCost:number|null; error:string|null; startedAt:string|null; completedAt:string|null; createdAt:string };
type Suppression = { id:number; type:string; value:string; reason:string; createdAt:string };

type AssetRating = "strong" | "adequate" | "constrained" | "weak" | "unknown";
type AssetDimension = { rating:AssetRating; evidence:string; evidenceSources:string[]; confidence:number };
type PerformanceAssessment = { overall:string; scoreBand:string; lcpBand:string; tbtBand:string; clsBand:string; poorMetricCount:number; needsImprovementMetricCount:number; strongPerformanceSignal:boolean };
type SiteCoverage = { mode:string; sitemapUrlsFound:number; representativePagesAttempted:number; representativePagesFetched:number; serviceUrlsObserved:number; locationUrlsObserved:number; aboutUrlsObserved:number; contactUrlsObserved?:number; architectureEvidenceComplete:boolean; warning:string };
type AssetFinding = { id:number; category:string; title:string; evidence:string; assetCapability:string; confidence:number; significance:"low"|"medium"|"high"; evidenceSources:string[]; createdAt:string };
type AssetAssessment = {
  id:number; decision:string; assetStrength:AssetRating;
  dimensions:{ performanceEffectiveness:AssetDimension; demandAlignment:AssetDimension; businessRepresentation:AssetDimension; customerActionCapability:AssetDimension; acquisitionReadiness:AssetDimension; siteMaturity:AssetDimension };
  performanceAssessment:PerformanceAssessment; siteCoverage:SiteCoverage; researchSummary:string; decisionReason:string; confidence:number; model:string; researchVersion:string; createdAt:string; findings:AssetFinding[];
};

type LeadDetail = {
  id:number; domain:string; businessName:string|null; landingPageUrl:string; keyword:string; adSource:string; lighthouseScore:number; lcp:number; cls:number|null; tbt:number|null;
  email:string|null; phone:string|null; address:string|null; contactPageUrl:string|null; enrichmentStatus:string|null; enrichmentNotes:string|null; isAgencyManaged:boolean; agencyName:string|null;
  isNationalChain:boolean; chainReason:string|null; status:string; qualificationDecision:string|null; qualificationReason:string|null; priorityScore:number|null; primaryOutreachAngle:string|null;
  researchSummary:string|null; researchVersion:string|null; lastResearchedAt:string|null; assetStrength?:AssetRating|null; replyStatus:string|null; replySummary:string|null; lastReplyAt:string|null; outreachCount:number;
  firstContactAt:string|null; lastOutreachDate:string|null; followUpDate:string|null; notes:unknown; createdAt:string; updatedAt:string;
  problems:Problem[]; scores:Score[]; outreachMessages:Message[]; activities:Activity[]; aiJobs:AIJob[]; suppressions:Suppression[];
};
type ResearchPayload = LeadDetail & { assetAssessments?:AssetAssessment[] };

const dimensionLabels:Array<[keyof AssetAssessment["dimensions"],string]> = [
  ["performanceEffectiveness","Performance effectiveness"],
  ["demandAlignment","Demand alignment"],
  ["businessRepresentation","Business representation"],
  ["customerActionCapability","Customer-action capability"],
  ["acquisitionReadiness","Acquisition readiness"],
  ["siteMaturity","Site maturity"],
];

function fmt(value:string|null|undefined){ return value ? new Date(value).toLocaleString() : "—"; }
function pct(value:number){ return `${Math.round(value*100)}%`; }
function label(value:string|null|undefined){ return value ? value.replaceAll("_"," ") : "—"; }
function ratingClass(rating:string){
  if(rating==="strong") return "text-emerald-300";
  if(rating==="adequate"||rating==="good") return "text-sky-300";
  if(rating==="constrained"||rating==="needs_improvement") return "text-amber-300";
  if(rating==="weak"||rating==="poor") return "text-red-300";
  return "text-zinc-400";
}

export default function LeadDetailPage({ params }:{ params:Promise<{id:string}> }) {
  const [id,setId]=useState<string|null>(null);
  const [lead,setLead]=useState<LeadDetail|null>(null);
  const [assetAssessment,setAssetAssessment]=useState<AssetAssessment|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [revalidating,setRevalidating]=useState(false);
  const [contactMessage,setContactMessage]=useState<string|null>(null);
  const [contactError,setContactError]=useState<string|null>(null);

  useEffect(()=>{ params.then(p=>setId(p.id)); },[params]);

  async function loadLead(leadId:string){
    const [detailRes,researchRes]=await Promise.all([
      fetch(`/api/leads/${leadId}/detail`,{cache:"no-store"}),
      fetch(`/api/leads/${leadId}/research`,{cache:"no-store"}),
    ]);
    const detailData=await detailRes.json();
    if(!detailRes.ok) throw new Error(detailData.error??"Failed to load lead");
    setLead(detailData.lead);
    if(researchRes.ok){
      const researchData=await researchRes.json() as ResearchPayload;
      setAssetAssessment(researchData.assetAssessments?.[0]??null);
    }else setAssetAssessment(null);
  }

  useEffect(()=>{
    if(!id) return;
    (async()=>{ try{ await loadLead(id); }catch(e){ setError(e instanceof Error?e.message:String(e)); }finally{ setLoading(false); } })();
  },[id]);

  async function revalidateContact(){
    if(!lead) return;
    setRevalidating(true); setContactMessage(null); setContactError(null);
    try{
      const res=await fetch(`/api/leads/${lead.id}/enrich-email?force=true`,{method:"POST"});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error??"Contact revalidation failed");
      await loadLead(String(lead.id));
      if(data.protected){
        setContactMessage("Existing contact data is not enrichment-sourced, so it was left unchanged.");
      }else{
        const results:string[]=[];
        if(data.emailProtected) results.push("Existing email is not enrichment-sourced, so it was left unchanged.");
        else if(data.identityChanged&&data.email) results.push(`Enriched email was replaced with ${data.email} after identity verification.`);
        else if(data.identityChanged) results.push("Enriched email failed identity verification and was removed. Unsent outreach using the old email was cancelled.");
        else if(data.email) results.push(`Enriched email passed identity verification: ${data.email}.`);
        else results.push("No identity-verified email was found.");
        if(data.phoneIdentityChanged&&data.phone) results.push(`Phone was replaced with ${data.phone} from an identity-matched local-business listing.`);
        else if(data.phoneRevalidated&&data.phone) results.push(`Phone was revalidated against an identity-matched local-business listing: ${data.phone}.`);
        setContactMessage(results.join(" "));
      }
    }catch(e){ setContactError(e instanceof Error?e.message:String(e)); }
    finally{ setRevalidating(false); }
  }

  if(loading) return <main className="min-h-screen bg-zinc-950 p-8 text-zinc-300">Loading lead…</main>;
  if(error||!lead) return <main className="min-h-screen bg-zinc-950 p-8 text-red-300">{error??"Lead not found"}</main>;

  const researchVersionNumber=Number(lead.researchVersion?.match(/^lead-research-v(\d+)$/)?.[1]??0);
  const isAssetResearch=researchVersionNumber>=6&&Boolean(assetAssessment);
  const latestScore=lead.scores[0];

  return <main className="min-h-screen bg-zinc-950 text-white"><div className="mx-auto max-w-6xl px-4 py-8">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs uppercase tracking-wider text-zinc-500">Lead #{lead.id}</div><h1 className="text-2xl font-bold">{lead.businessName||lead.domain}</h1><div className="mt-1 text-sm text-zinc-400">{lead.domain} · {lead.email??"No email"} · {lead.phone??"No phone"}</div></div><div className="flex gap-2"><Link href="/dashboard" className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">Dashboard</Link><a href={lead.landingPageUrl} target="_blank" rel="noreferrer" className="rounded bg-indigo-700 px-3 py-2 text-sm">Open website</a></div></div>

    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><div className="text-xs uppercase text-zinc-500">Status</div><div className="mt-1 font-semibold capitalize">{label(lead.status)}</div></div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><div className="text-xs uppercase text-zinc-500">{isAssetResearch?"Asset strength":"AI priority"}</div><div className={`mt-1 text-xl font-bold capitalize ${isAssetResearch?ratingClass(assetAssessment?.assetStrength??"unknown"):""}`}>{isAssetResearch?label(assetAssessment?.assetStrength):lead.priorityScore??"—"}</div></div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><div className="text-xs uppercase text-zinc-500">Decision</div><div className="mt-1 font-semibold capitalize">{label(lead.qualificationDecision??"Not researched")}</div></div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><div className="text-xs uppercase text-zinc-500">Next follow-up</div><div className="mt-1 font-semibold">{fmt(lead.followUpDate)}</div></div>
    </div>

    {isAssetResearch&&assetAssessment ? <>
      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Business asset assessment</h2><div className="mt-1 text-xs text-zinc-500">{assetAssessment.researchVersion} · {assetAssessment.model} · {fmt(assetAssessment.createdAt)}</div></div><div className="text-sm text-zinc-400">Assessment confidence {pct(assetAssessment.confidence)}</div></div><div className="mt-5 grid gap-5 md:grid-cols-2"><div><div className="text-xs uppercase tracking-wider text-zinc-500">Research summary</div><p className="mt-2 leading-6 text-zinc-300">{assetAssessment.researchSummary}</p></div><div><div className="text-xs uppercase tracking-wider text-zinc-500">Decision reason</div><p className="mt-2 leading-6 text-zinc-300">{assetAssessment.decisionReason}</p></div></div></section>

      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Business asset capabilities</h2><div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{dimensionLabels.map(([key,title])=>{ const dimension=assetAssessment.dimensions[key]; return <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><div className="flex items-start justify-between gap-3"><div className="font-medium">{title}</div><div className={`text-sm font-semibold capitalize ${ratingClass(dimension.rating)}`}>{label(dimension.rating)}</div></div><p className="mt-3 text-sm leading-6 text-zinc-300">{dimension.evidence}</p><div className="mt-3 text-xs text-zinc-500">Confidence {pct(dimension.confidence)} · Sources: {dimension.evidenceSources.join(", ")}</div></div>; })}</div></section>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Performance assessment</h2><div className="mt-4 grid grid-cols-2 gap-3 text-sm">{[["Overall",assetAssessment.performanceAssessment.overall],["Performance score",assetAssessment.performanceAssessment.scoreBand],["LCP",assetAssessment.performanceAssessment.lcpBand],["TBT",assetAssessment.performanceAssessment.tbtBand],["CLS",assetAssessment.performanceAssessment.clsBand]].map(([name,band])=><div key={name} className="rounded bg-zinc-950 p-3"><div className="text-zinc-500">{name}</div><div className={`mt-1 font-semibold capitalize ${ratingClass(band)}`}>{label(band)}</div></div>)}</div><div className="mt-4 text-sm text-zinc-400">Poor metrics: {assetAssessment.performanceAssessment.poorMetricCount} · Needs improvement: {assetAssessment.performanceAssessment.needsImprovementMetricCount}</div>{assetAssessment.performanceAssessment.strongPerformanceSignal&&<div className="mt-2 text-sm font-medium text-amber-300">Strong performance constraint detected.</div>}</section>
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Research coverage</h2><div className="mt-1 text-xs capitalize text-zinc-500">Mode: {label(assetAssessment.siteCoverage.mode)}</div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded bg-zinc-950 p-3"><div className="text-zinc-500">Sitemap URLs</div><div className="mt-1 text-lg font-semibold">{assetAssessment.siteCoverage.sitemapUrlsFound}</div></div><div className="rounded bg-zinc-950 p-3"><div className="text-zinc-500">Representative pages</div><div className="mt-1 text-lg font-semibold">{assetAssessment.siteCoverage.representativePagesFetched}/{assetAssessment.siteCoverage.representativePagesAttempted}</div></div><div className="rounded bg-zinc-950 p-3"><div className="text-zinc-500">Service URLs observed</div><div className="mt-1 text-lg font-semibold">{assetAssessment.siteCoverage.serviceUrlsObserved}</div></div><div className="rounded bg-zinc-950 p-3"><div className="text-zinc-500">Location URLs observed</div><div className="mt-1 text-lg font-semibold">{assetAssessment.siteCoverage.locationUrlsObserved}</div></div></div><p className="mt-4 text-xs leading-5 text-zinc-500">{assetAssessment.siteCoverage.warning}</p></section>
      </div>

      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Material findings</h2><div className="mt-4 space-y-3">{assetAssessment.findings.length===0?<p className="text-zinc-500">No material findings stored.</p>:assetAssessment.findings.map(finding=><div key={finding.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><div className="font-medium">{finding.title}</div><div className="text-xs capitalize text-zinc-500">{label(finding.category)} · {finding.significance} significance</div></div><div className="text-sm text-zinc-400">Confidence {pct(finding.confidence)}</div></div><div className="mt-3 text-sm"><span className="text-zinc-500">Evidence:</span> <span className="text-zinc-300">{finding.evidence}</span></div><div className="mt-2 text-sm"><span className="text-zinc-500">Asset capability affected:</span> <span className="text-zinc-300">{finding.assetCapability}</span></div><div className="mt-2 text-xs text-zinc-600">Sources: {finding.evidenceSources.join(", ")}</div></div>)}</div></section>
    </> : <>
      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Research</h2><div className="mt-4 grid gap-5 md:grid-cols-2"><div><div className="text-xs uppercase tracking-wider text-zinc-500">Summary</div><p className="mt-2 leading-6 text-zinc-300">{lead.researchSummary??"No research summary yet."}</p><div className="mt-4 text-xs uppercase tracking-wider text-zinc-500">Qualification reason</div><p className="mt-2 text-sm leading-6 text-zinc-300">{lead.qualificationReason??"—"}</p><div className="mt-4 text-xs uppercase tracking-wider text-zinc-500">Primary outreach angle</div><p className="mt-2 text-sm leading-6 text-zinc-300">{lead.primaryOutreachAngle??"—"}</p></div><div><div className="text-xs uppercase tracking-wider text-zinc-500">Historical v5 dimension scores</div>{latestScore?<div className="mt-2 grid grid-cols-2 gap-2 text-sm">{[["Business fit",latestScore.businessFit],["Website need",latestScore.websiteNeed],["Ability to pay",latestScore.abilityToPay],["Contactability",latestScore.contactability],["Urgency",latestScore.urgency],["Sales opportunity",latestScore.salesOpportunity]].map(([name,value])=><div key={String(name)} className="rounded bg-zinc-950 p-3"><div className="text-zinc-500">{name}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>)}</div>:<p className="mt-2 text-zinc-500">No scores yet.</p>}<div className="mt-3 text-xs text-zinc-500">Last researched: {fmt(lead.lastResearchedAt)} · Version: {lead.researchVersion??"—"}</div></div></div></section>
      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Historical problems & evidence</h2><div className="mt-4 space-y-3">{lead.problems.length===0?<p className="text-zinc-500">No structured problems stored.</p>:lead.problems.map(problem=><div key={problem.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><div className="font-medium">{problem.title}</div><div className="text-xs text-zinc-500">{problem.category} · outreach {problem.outreachValue}</div></div><div className="text-sm text-zinc-400">Confidence {pct(problem.confidence)}</div></div><div className="mt-3 text-sm"><span className="text-zinc-500">Evidence:</span> <span className="text-zinc-300">{problem.evidence}</span></div><div className="mt-2 text-sm"><span className="text-zinc-500">Business consequence:</span> <span className="text-zinc-300">{problem.businessConsequence}</span></div>{problem.recommendedImprovement&&<div className="mt-2 text-sm"><span className="text-zinc-500">Improvement:</span> <span className="text-zinc-300">{problem.recommendedImprovement}</span></div>}</div>)}</div></section>
    </>}

    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Outreach history</h2><div className="mt-4 space-y-4">{lead.outreachMessages.length===0?<p className="text-zinc-500">No outreach messages yet.</p>:lead.outreachMessages.map(message=><div key={message.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div className="font-medium">{message.kind} · step {message.sequenceNumber}</div><div className="text-xs text-zinc-500">{message.status} · sent {fmt(message.sentAt)}</div></div><div className="mt-2 text-sm font-medium text-zinc-300">{message.subject}</div><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-400">{message.bodyText}</pre>{message.sendError&&<div className="mt-3 rounded bg-red-950/40 px-3 py-2 text-xs text-red-300">Send error: {message.sendError}</div>}<div className="mt-3 text-xs text-zinc-600">Provider message: {message.providerMessageId??"—"} · Thread: {message.providerThreadId??"—"}</div></div>)}</div></section>

    {lead.replyStatus&&<section className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/20 p-5"><h2 className="text-lg font-semibold text-emerald-300">Reply</h2><div className="mt-3 text-sm"><span className="text-zinc-500">Classification:</span> {lead.replyStatus}</div><p className="mt-2 leading-6 text-zinc-300">{lead.replySummary??"—"}</p><div className="mt-2 text-xs text-zinc-500">Last reply: {fmt(lead.lastReplyAt)}</div></section>}

    <div className="mb-6 grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">AI jobs</h2><div className="mt-4 space-y-2">{lead.aiJobs.length===0?<p className="text-zinc-500">No AI jobs.</p>:lead.aiJobs.map(job=><div key={job.id} className="rounded bg-zinc-950 p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-medium">{job.type}</span><span className="text-zinc-500">{job.status}</span></div><div className="mt-1 text-xs text-zinc-500">{job.model} · {job.promptVersion} · {fmt(job.createdAt)}</div>{(job.inputTokens!=null||job.outputTokens!=null)&&<div className="mt-1 text-xs text-zinc-500">Tokens: {job.inputTokens??0} in / {job.outputTokens??0} out · Cost {job.estimatedCost!=null?`$${job.estimatedCost.toFixed(4)}`:"—"}</div>}{job.error&&<div className="mt-2 text-xs text-red-300">{job.error}</div>}</div>)}</div></section><section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Contact & source</h2>{(lead.email||lead.phone)&&<button type="button" onClick={revalidateContact} disabled={revalidating} className="rounded border border-amber-700 bg-amber-950/40 px-3 py-2 text-xs font-medium text-amber-200 disabled:cursor-not-allowed disabled:opacity-50">{revalidating?"Revalidating…":"Revalidate enriched contact"}</button>}</div>{contactMessage&&<div className="mt-3 rounded border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">{contactMessage}</div>}{contactError&&<div className="mt-3 rounded border border-red-900 bg-red-950/30 px-3 py-2 text-xs text-red-300">{contactError}</div>}<div className="mt-4 space-y-2 text-sm text-zinc-300"><div>{lead.email??"No email"}</div><div>{lead.phone??"No phone"}</div><div>{lead.address??"No address"}</div><div>Keyword: {lead.keyword}</div><div>Source: {lead.adSource}</div><div>Enrichment: {lead.enrichmentStatus??"—"}</div>{lead.isAgencyManaged&&<div className="text-orange-300">Agency managed: {lead.agencyName??"detected"}</div>}{lead.isNationalChain&&<div className="text-red-300">National chain: {lead.chainReason??"detected"}</div>}{lead.suppressions.length>0&&<div className="mt-4"><div className="text-xs uppercase text-zinc-500">Suppressions</div>{lead.suppressions.map(suppression=><div key={suppression.id} className="mt-1 text-red-300">{suppression.type}: {suppression.reason}</div>)}</div>}</div></section></div>

    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-lg font-semibold">Activity timeline</h2><div className="mt-4 space-y-3">{lead.activities.length===0?<p className="text-zinc-500">No activity yet.</p>:lead.activities.map(activity=><div key={activity.id} className="border-l border-zinc-700 pl-4"><div className="text-sm font-medium text-zinc-200">{activity.summary}</div><div className="mt-1 text-xs text-zinc-500">{activity.type} · {fmt(activity.createdAt)}</div></div>)}</div></section>
  </div></main>;
}
