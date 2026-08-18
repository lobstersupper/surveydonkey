'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import {
  registerAccountAction,
  verifyEmailCodeAction,
  resendVerificationCodeAction,
} from '@/actions/auth-actions';
import { TurnstileWidget } from '@/components/turnstile-widget';

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
  const [step, setStep] = useState<'form' | 'verify_email'>('form');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [verificationCode, setVerificationCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('form');
      setErrorMsg(null);
      setSuccessMsg(null);
      setVerificationCode('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!turnstileToken) {
      setErrorMsg('Please complete the bot security challenge.');
      return;
    }

    setLoading(true);

    try {
      const regRes = await registerAccountAction({
        name,
        email,
        password,
        role: 'creator',
        turnstileToken,
      });

      setLoading(false);

      if (!regRes.success) {
        setErrorMsg(regRes.error || 'Failed to create account.');
        return;
      }

      if (regRes.requireVerification) {
        setDevCodeHint(regRes.devCode || null);
        setStep('verify_email');
        setSuccessMsg(`We sent a 6-digit verification code to ${email}.`);
      }
    } catch (err) {
      console.error('Sign up error:', err);
      setErrorMsg('An unexpected error occurred during account creation.');
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const verifyRes = await verifyEmailCodeAction({
        email,
        code: verificationCode,
      });

      if (!verifyRes.success) {
        setErrorMsg(verifyRes.error || 'Invalid verification code.');
        setLoading(false);
        return;
      }

      // Automatically sign in the newly verified account
      const authRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (authRes?.error) {
        setErrorMsg('Email verified! Please sign in with your credentials.');
        setStep('form');
        setMode('signin');
      } else {
        onSuccess({ name, email });
      }
    } catch (err) {
      console.error('Verification error:', err);
      setErrorMsg('Failed to verify code.');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setResending(true);

    try {
      const res = await resendVerificationCodeAction({ email });
      setResending(false);

      if (res.success) {
        if (res.devCode) setDevCodeHint(res.devCode);
        setSuccessMsg(`A fresh verification code was dispatched to ${email}.`);
      } else {
        setErrorMsg(res.error || 'Failed to resend code.');
      }
    } catch (err) {
      console.error('Resend code error:', err);
      setErrorMsg('Failed to resend verification code.');
      setResending(false);
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
            {step === 'verify_email' ? 'Verify Your Email' : title}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {step === 'verify_email'
              ? `Enter the 6-digit confirmation code sent to ${email} to publish your survey.`
              : subtitle}
          </p>
        </div>

        {/* Step: Verify Email */}
        {step === 'verify_email' ? (
          <div className="space-y-5">
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            {devCodeHint && (
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs rounded-lg font-mono text-center dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-200">
                <span className="font-bold uppercase tracking-wider block text-[10px] text-indigo-500">Dev Mode Code Preview</span>
                {devCodeHint}
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full p-3 text-center text-2xl font-extrabold tracking-[8px] font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="btn-primary w-full py-2.5 text-xs font-bold justify-center shadow-sm disabled:opacity-50"
              >
                {loading ? 'Verifying & Publishing...' : 'Verify & Publish Survey →'}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="hover:underline text-slate-600 dark:text-slate-400"
              >
                ← Back to edit email
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </div>
        ) : (
          /* Step: Form (Sign Up or Sign In) */
          <>
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

                {/* Cloudflare Turnstile Challenge */}
                <div className="pt-1">
                  <TurnstileWidget onVerify={(token) => setTurnstileToken(token)} />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 text-xs font-bold justify-center shadow-sm"
                >
                  {loading ? 'Sending Verification Code...' : 'Create Account & Send Code →'}
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
          </>
        )}
      </div>
    </div>
  );
};
