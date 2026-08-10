'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { surveyStore } from '@/lib/store';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('creator@surveydonkey.com');
  const [password, setPassword] = useState('password123');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();

    if (email.includes('admin')) {
      surveyStore.setCurrentUser('user_admin');
    } else if (email.includes('sarah') || email.includes('respondent')) {
      surveyStore.setCurrentUser('user_respondent_1');
    } else {
      surveyStore.setCurrentUser('user_creator_1');
    }

    router.push('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="card-high-signal space-y-6 p-8">
        <div className="text-center space-y-1">
          <span className="badge-minimal">Authentication</span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Sign In to Survey Donkey
          </h1>
          <p className="text-xs text-slate-500">
            Enter your credentials or test with predefined roles below.
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full py-2.5 text-xs">
            Sign In →
          </button>
        </form>

        {/* Preset quick test buttons */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
            Quick Sign In Presets
          </span>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                surveyStore.setCurrentUser('user_creator_1');
                router.push('/dashboard');
              }}
              className="p-2 border rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100"
            >
              Creator
            </button>

            <button
              type="button"
              onClick={() => {
                surveyStore.setCurrentUser('user_admin');
                router.push('/admin');
              }}
              className="p-2 border rounded bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-200 hover:bg-purple-100"
            >
              Superadmin
            </button>

            <button
              type="button"
              onClick={() => {
                surveyStore.setCurrentUser('user_respondent_1');
                router.push('/');
              }}
              className="p-2 border rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100"
            >
              Respondent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
