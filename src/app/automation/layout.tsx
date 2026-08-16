import Link from "next/link";

export default function AutomationLayout({children}:{children:React.ReactNode}){
  return <><div className="border-b border-zinc-800 bg-zinc-950"><div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-2 text-xs"><span className="mr-2 py-1 text-zinc-500">Automation</span><Link href="/automation" className="rounded bg-zinc-900 px-2 py-1 text-zinc-300 hover:text-white">Operations</Link><Link href="/automation/maintenance" className="rounded bg-zinc-900 px-2 py-1 text-zinc-300 hover:text-white">Maintenance jobs</Link><Link href="/automation/errors" className="rounded bg-zinc-900 px-2 py-1 text-zinc-300 hover:text-white">Error queue</Link></div></div>{children}</>;
}
