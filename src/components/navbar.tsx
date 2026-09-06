'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { getUserCoinsAction } from '@/actions/survey-actions';
import { CoinTransaction } from '@/db/schema';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const user = session?.user;
  const currentRole = (user as { role?: string } | undefined)?.role;

  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [coinLedger, setCoinLedger] = useState<CoinTransaction[]>([]);

  useEffect(() => {
    if (status === 'authenticated') {
      getUserCoinsAction().then((res) => {
        setUserCoins(res.balance);
        setCoinLedger(res.transactions);
      });
    }
  }, [status]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.reload();
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-50 transition-colors">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand & Main Links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
              SD
            </span>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 tracking-tight text-base uppercase">
              Survey Donkey
            </span>
          </Link>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Link
              href="/"
              className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors ${
                pathname === '/' ? 'text-slate-900 dark:text-white font-bold' : ''
              }`}
            >
              Surveys Feed
            </Link>
            <Link
              href="/dashboard"
              className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors ${
                pathname === '/dashboard' ? 'text-slate-900 dark:text-white font-bold' : ''
              }`}
            >
              Creator Studio
            </Link>
            <Link
              href="/rewards"
              className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors ${
                pathname === '/rewards' ? 'text-slate-900 dark:text-white font-bold' : ''
              }`}
            >
              Rewards
            </Link>
            {currentRole === 'superadmin' && (
              <Link
                href="/admin"
                className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors ${
                  pathname === '/admin' ? 'text-slate-900 dark:text-white font-bold' : ''
                }`}
              >
                Admin Panel
              </Link>
            )}
          </nav>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/new"
            className="btn-primary text-xs hidden sm:inline-flex shadow-sm hover:shadow"
          >
            + New Survey
          </Link>

          {status === 'authenticated' && user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              {/* {{coins}} Wallet Indicator */}
              <div className="relative group">
                <Link
                  href="/rewards"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold shadow-sm hover:scale-105 transition-transform"
                >
                  <span className="text-amber-500">🪙</span>
                  <span>{userCoins !== null ? userCoins : '...'}</span>
                  <span className="text-[10px] text-amber-600/80 uppercase">coins</span>
                </Link>

                {/* Ledger Popover */}
                {coinLedger.length > 0 && (
                  <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 hidden group-hover:block animate-fade-in">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Coin Ledger
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {userCoins} total
                      </span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {coinLedger.slice(0, 5).map((tx) => (
                        <div key={tx.id} className="text-[11px] flex justify-between gap-2">
                          <span className="text-slate-600 dark:text-slate-400 truncate">
                            {tx.description || tx.type}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono shrink-0">
                            +{tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                      <Link
                        href="/rewards"
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline block"
                      >
                        View Rewards Hub & Ledger →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Identity Chip */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  {user.name ? user.name.charAt(0) : user.email?.charAt(0) || 'U'}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[130px]">
                    {user.name || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {currentRole === 'superadmin' ? 'Superadmin' : 'Creator'}
                  </span>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="btn-secondary text-xs py-1 px-2.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300 transition-colors"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <Link href="/auth/signin" className="btn-secondary text-xs py-1.5 px-3">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
