import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';

import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Survey Donkey | Community Consensus Surveys',
  description: 'Participate anonymously in community surveys and explore demographic insights.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <Providers>
          <Navbar />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
          <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-center text-slate-500">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
              <span>Survey Donkey © 2026. All rights reserved.</span>
              <span className="text-slate-400">
                Anonymous community surveys & analytics
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
