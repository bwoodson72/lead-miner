import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "Lead Miner", description: "AI-assisted lead research, outreach, follow-up, and reply operations" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
    <nav className="border-b border-zinc-800 bg-zinc-950"><div className="mx-auto flex min-h-12 max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
      <span className="text-sm font-bold tracking-tight text-white">Lead Miner</span>
      <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">Search</Link>
      <Link href="/dashboard" className="text-sm text-zinc-400 transition-colors hover:text-white">Leads</Link>
      <Link href="/outreach" className="text-sm text-zinc-400 transition-colors hover:text-white">Outreach</Link>
      <Link href="/inbox" className="text-sm text-zinc-400 transition-colors hover:text-white">Inbox</Link>
      <Link href="/analytics" className="text-sm text-zinc-400 transition-colors hover:text-white">Analytics</Link>
      <Link href="/automation" className="text-sm text-zinc-400 transition-colors hover:text-white">Automation</Link>
      <Link href="/settings" className="text-sm text-zinc-400 transition-colors hover:text-white">Settings</Link>
    </div></nav>
    {children}
  </body></html>;
}
