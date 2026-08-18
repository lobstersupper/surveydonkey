'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const user = session?.user;
  const currentRole = (user as { role?: string } | undefined)?.role;

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
            <span className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-extrabold text-sm flex items-center justify-center tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
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
