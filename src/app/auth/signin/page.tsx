'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { registerAccountAction } from '@/actions/auth-actions';

export default function SignInPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setErrorMsg('Invalid email address or password.');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const regRes = await registerAccountAction({
      name,
      email,
      password,
      role: 'creator',
    });

    if (!regRes.success) {
      setErrorMsg(regRes.error || 'Failed to create account.');
      setLoading(false);
      return;
    }

    // Sign in the newly registered account
    const authRes = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (authRes?.error) {
      setErrorMsg('Account created successfully! Please sign in with your credentials.');
      setTab('signin');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="card-high-signal space-y-6 p-8">
        <div className="text-center space-y-1">
          <span className="badge-minimal">Authentication</span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {tab === 'signin' ? 'Sign In to Survey Donkey' : 'Create an Account'}
          </h1>
          <p className="text-xs text-slate-500">
            {tab === 'signin'
              ? 'Enter your account credentials to access your Creator Workspace.'
              : 'Sign up to build, configure, and publish consensus surveys.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setErrorMsg(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-bold transition-colors border-b-2 ${
              tab === 'signin'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-bold transition-colors border-b-2 ${
              tab === 'signup'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 focus:outline-none"
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
                placeholder="••••••••"
                className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-xs font-bold justify-center shadow-sm">
              {loading ? 'Signing In...' : 'Sign In →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 focus:outline-none"
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
                placeholder="••••••••"
                className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                required
                minLength={6}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Minimum 6 characters</span>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-xs font-bold justify-center shadow-sm">
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
