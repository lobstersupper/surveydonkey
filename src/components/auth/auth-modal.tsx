'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { registerAccountAction } from '@/actions/auth-actions';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { name?: string | null; email?: string | null }) => void;
  title?: string;
  subtitle?: string;
  initialMode?: 'signup' | 'signin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Create an Account to Publish',
  subtitle = 'Anyone can draft surveys freely. Create an account or sign in to activate and publish your survey.',
  initialMode = 'signup',
}) => {
  const [mode, setMode] = useState<'signup' | 'signin'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
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

      // Automatically sign in the newly registered account
      const authRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (authRes?.error) {
        setErrorMsg('Account created, but sign-in failed. Please try signing in.');
        setLoading(false);
        setMode('signin');
      } else {
        setLoading(false);
        onSuccess({ name, email });
      }
    } catch (err) {
      console.error('Sign up error:', err);
      setErrorMsg('An unexpected error occurred during account creation.');
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const authRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (authRes?.error) {
        setErrorMsg('Invalid email address or password.');
      } else {
        onSuccess({ email });
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setErrorMsg('Failed to sign in.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 md:p-8 space-y-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 rounded-md transition-colors"
          title="Close modal"
          type="button"
        >
          ✕
        </button>

        {/* Header */}
        <div className="space-y-1 pr-6">
          <span className="badge-minimal">Creator Authorization</span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-bold transition-colors border-b-2 ${
              mode === 'signup'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-bold transition-colors border-b-2 ${
              mode === 'signin'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Sign In Existing
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Signup Form */}
        {mode === 'signup' ? (
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
                className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 focus:outline-none"
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
                className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 focus:outline-none"
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
                className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                required
                minLength={6}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Minimum 6 characters</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-bold justify-center shadow-sm"
            >
              {loading ? 'Creating Account & Publishing...' : 'Create Account & Publish →'}
            </button>
          </form>
        ) : (
          /* Sign In Form */
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
                className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 focus:outline-none"
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
                className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-bold justify-center shadow-sm"
            >
              {loading ? 'Signing In & Publishing...' : 'Sign In & Publish →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
