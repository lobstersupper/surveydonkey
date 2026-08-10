'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { surveyStore } from '@/lib/store';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(surveyStore.getCurrentUser());

  const handleSwitchUser = (userId: string) => {
    surveyStore.setCurrentUser(userId);
    setCurrentUser(surveyStore.getCurrentUser());
    window.location.reload();
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-extrabold text-sm flex items-center justify-center tracking-tighter">
              SD
            </span>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 tracking-tight text-base uppercase">
              Survey Donkey
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Link
              href="/"
              className={`hover:text-slate-900 dark:hover:text-slate-100 ${
                pathname === '/' ? 'text-slate-900 dark:text-white font-bold' : ''
              }`}
            >
              Surveys Feed
            </Link>
            <Link
              href="/dashboard"
              className={`hover:text-slate-900 dark:hover:text-slate-100 ${
                pathname === '/dashboard' ? 'text-slate-900 dark:text-white font-bold' : ''
              }`}
            >
              Creator Studio
            </Link>
            {currentUser.role === 'superadmin' && (
              <Link
                href="/admin"
                className={`hover:text-slate-900 dark:hover:text-slate-100 ${
                  pathname === '/admin' ? 'text-slate-900 dark:text-white font-bold' : ''
                }`}
              >
                Superadmin Panel
              </Link>
            )}
          </nav>
        </div>

        {/* Role & Account Switcher */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/new" className="btn-primary text-xs hidden sm:inline-flex">
            + New Survey
          </Link>

          {/* Demo User Switcher Dropdown */}
          <div className="relative border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-800 px-2 py-1 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Role:
            </span>
            <select
              value={currentUser.id}
              onChange={(e) => handleSwitchUser(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="user_creator_1">Creator (Alan)</option>
              <option value="user_admin">Superadmin (Admin)</option>
              <option value="user_respondent_1">Respondent (Sarah)</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
