import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lead Miner",
  description: "Find and manage leads from businesses with slow websites",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="border-b border-zinc-800 bg-zinc-950">
          <div className="mx-auto max-w-7xl px-4 flex items-center gap-6 h-12">
            <span className="text-sm font-bold text-white tracking-tight">Lead Miner</span>
            <a href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">Search</a>
            <a href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">Dashboard</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
