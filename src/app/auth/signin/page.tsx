'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('creator@surveydonkey.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setErrorMsg('Invalid email or credentials.');
    } else {
      if (email.includes('admin')) {
        router.push('/admin');
      } else if (email.includes('sarah') || email.includes('respondent')) {
        router.push('/');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    }
  };

  const handleQuickLogin = async (roleEmail: string, targetPath: string) => {
    setLoading(true);
    setErrorMsg(null);
    const res = await signIn('credentials', {
      email: roleEmail,
      password: 'password123',
      redirect: false,
    });
    setLoading(false);

    if (!res?.error) {
      router.push(targetPath);
      router.refresh();
    } else {
      setErrorMsg('Failed to sign in.');
    }
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

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
            {errorMsg}
          </div>
        )}

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

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-xs">
            {loading ? 'Signing In...' : 'Sign In →'}
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
              disabled={loading}
              onClick={() => handleQuickLogin('creator@surveydonkey.com', '/dashboard')}
              className="p-2 border rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Creator
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin@surveydonkey.com', '/admin')}
              className="p-2 border rounded bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900"
            >
              Admin
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('sarah@example.com', '/')}
              className="p-2 border rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Respondent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
