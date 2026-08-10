import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';

export const metadata: Metadata = {
  title: 'Survey Donkey | High-Signal Minimalist Consensus Platform',
  description: 'Text-only survey engine with dynamic logic jumps, delayed gratification results unlock, and interactive D3 demographic cluster infographics.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-center text-slate-500">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <span>SURVEY DONKEY © 2026. Zero-Fluff Consensus Engine.</span>
            <span className="font-mono text-[10px] text-slate-400">
              Neon Postgres • Auth.js • D3.js • Vercel Edge
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
