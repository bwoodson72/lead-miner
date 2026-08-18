import Link from "next/link";

export default function DashboardLayout({children}:{children:React.ReactNode}){
  return <><div className="border-b border-zinc-800 bg-zinc-950"><div className="mx-auto flex max-w-[1500px] flex-wrap gap-2 px-4 py-2 text-xs"><span className="mr-2 py-1 text-zinc-500">Leads</span><Link href="/dashboard" className="rounded bg-zinc-900 px-2 py-1 text-zinc-300 hover:text-white">Operations</Link><Link href="/leads" className="rounded bg-zinc-900 px-2 py-1 text-zinc-300 hover:text-white">Advanced filters</Link><a href="/api/leads/export" className="rounded bg-zinc-900 px-2 py-1 text-zinc-300 hover:text-white">Export CSV</a></div></div>{children}</>;
}
