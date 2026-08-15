import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "Lead Miner", description: "Find and manage leads from businesses with slow websites" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
    <nav className="border-b border-zinc-800 bg-zinc-950"><div className="mx-auto flex h-12 max-w-7xl items-center gap-6 px-4">
      <span className="text-sm font-bold tracking-tight text-white">Lead Miner</span>
      <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">Search</Link>
      <Link href="/dashboard" className="text-sm text-zinc-400 transition-colors hover:text-white">Dashboard</Link>
      <Link href="/pipeline" className="text-sm text-zinc-400 transition-colors hover:text-white">Pipeline</Link>
      <Link href="/outreach" className="text-sm text-zinc-400 transition-colors hover:text-white">Outreach</Link>
      <Link href="/inbox" className="text-sm text-zinc-400 transition-colors hover:text-white">Action Center</Link>
      <Link href="/settings" className="text-sm text-zinc-400 transition-colors hover:text-white">Settings</Link>
    </div></nav>
    {children}
  </body></html>;
}
