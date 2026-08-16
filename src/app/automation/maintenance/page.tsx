"use client";

import {useState} from "react";

type JobName="revisit_due"|"recalculate_priorities";
const jobs:Array<{name:JobName;title:string;description:string}>=[
  {name:"revisit_due",title:"Reopen due revisits",description:"Surface not-now prospects whose configured revisit date has arrived."},
  {name:"recalculate_priorities",title:"Recalculate priorities",description:"Recompute deterministic opportunity scores using the current configured weights."},
];

export default function MaintenanceJobsPage(){
  const[running,setRunning]=useState<JobName|null>(null);const[message,setMessage]=useState<string|null>(null);
  async function run(jobName:JobName){setRunning(jobName);setMessage(null);try{const res=await fetch("/api/automation/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobName})});const body=await res.json();if(!res.ok)throw new Error(body.error??"Job failed");setMessage(`${jobName.replaceAll("_"," ")}: ${body.succeeded??0}/${body.processed??0} succeeded${body.failed?` · ${body.failed} failed`:""}.`);}catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setRunning(null);}}
  return <main className="min-h-screen bg-zinc-950 text-white"><div className="mx-auto max-w-5xl px-4 py-8"><h1 className="text-2xl font-bold">Maintenance Jobs</h1><p className="mt-1 text-sm text-zinc-400">Deterministic lifecycle maintenance jobs that also run from the scheduled automation tick.</p>{message&&<div className="mt-5 rounded border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm">{message}</div>}<div className="mt-6 grid gap-4 md:grid-cols-2">{jobs.map(job=><section key={job.name} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-semibold">{job.title}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{job.description}</p><button disabled={running!==null} onClick={()=>run(job.name)} className="mt-4 rounded bg-indigo-700 px-4 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">{running===job.name?"Running…":"Run now"}</button></section>)}</div></div></main>;
}
