import Link from "next/link";

export default function SettingsLayout({children}:{children:React.ReactNode}){
  return <><div className="border-b border-zinc-800 bg-zinc-950"><div className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 py-2 text-xs"><span className="mr-2 py-1 text-zinc-500">Settings</span><Link href="/settings" className="rounded bg-zinc-900 px-2 py-1 text-zinc-300 hover:text-white">General</Link><Link href="/settings/suppressions" className="rounded bg-zinc-900 px-2 py-1 text-zinc-300 hover:text-white">Suppressions</Link></div></div>{children}</>;
}
