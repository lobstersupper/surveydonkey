'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  getUserCoinsAction,
  claimDailyBonusAction,
  redeemPerkAction,
} from '@/actions/survey-actions';
import { CoinTransaction } from '@/db/schema';
import {
  Coins,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Gift,
  Flame,
  Award,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export default function RewardsHubPage() {
  const { data: session, status } = useSession();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [canClaimDaily, setCanClaimDaily] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [claimLoading, setClaimLoading] = useState<boolean>(false);
  const [perkLoading, setPerkLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const res = await getUserCoinsAction();
      setBalance(res.balance);
      setTransactions(res.transactions);
      setCanClaimDaily(res.canClaimDaily);
    } catch (err) {
      console.error('Failed to load user coins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserData();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  const handleClaimDaily = async () => {
    setMessage(null);
    setClaimLoading(true);
    try {
      const res = await claimDailyBonusAction();
      if (res.success) {
        setMessage({
          type: 'success',
          text: 'Claimed +10 {{coins}}! Daily participation streak updated.',
        });
        await fetchUserData();
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Failed to claim daily bonus.',
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error claiming daily bonus.' });
    } finally {
      setClaimLoading(false);
    }
  };

  const handleRedeemPerk = async (cost: number, title: string) => {
    if (!balance || balance < cost) {
      setMessage({
        type: 'error',
        text: `Insufficient {{coins}}. You need ${cost} {{coins}} for this perk.`,
      });
      return;
    }

    setMessage(null);
    setPerkLoading(title);
    try {
      const res = await redeemPerkAction(cost, title);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Perk unlocked: "${title}"!`,
        });
        await fetchUserData();
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Failed to redeem perk.',
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error processing redemption.' });
    } finally {
      setPerkLoading(null);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-minimal">Economy & Rewards</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            Rewards Hub & Ledger
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Participate in opinion polls and personality tests to earn {'{{coins}}'}. Use {'{{coins}}'} to promote surveys and unlock community perks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/" className="btn-secondary text-xs">
            Browse Hot Surveys
          </Link>
          <Link href="/dashboard" className="btn-primary text-xs">
            Creator Studio
          </Link>
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Not Logged In Prompt */}
      {status === 'unauthenticated' && (
        <div className="card-high-signal p-8 rounded-xl text-center space-y-4 border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xl">
            🪙
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Sign In to Access Your {'{{coins}}'} Wallet
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Create a free account or sign in to accumulate rewards for every survey you complete, earn creator milestones, and redeem perks.
            </p>
          </div>
          <Link href="/auth/signin" className="btn-primary text-xs px-5 py-2.5 inline-block">
            Sign In / Register
          </Link>
        </div>
      )}

      {status === 'authenticated' && (
        <>
          {/* Main Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Balance & Daily Streak */}
            <div className="card-high-signal p-6 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/50 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Total Wallet Balance
                </span>
                <span className="text-amber-500 text-lg">🪙</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
                  {loading ? '...' : balance}
                </span>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {'{{coins}}'}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                {canClaimDaily ? (
                  <button
                    onClick={handleClaimDaily}
                    disabled={claimLoading}
                    className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Gift size={14} />
                    {claimLoading ? 'Claiming...' : 'Claim Daily Bonus (+10 {{coins}})'}
                  </button>
                ) : (
                  <div className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-center text-xs font-medium text-slate-500 flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    Daily streak bonus claimed for today
                  </div>
                )}
              </div>
            </div>

            {/* How to Earn */}
            <div className="card-high-signal p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  How To Earn
                </span>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Take Verified Survey</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +5 to +25 {'{{coins}}'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Creator Milestone (10 votes)</span>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                    +25 {'{{coins}}'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Daily Activity Streak</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    +10 {'{{coins}}'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100 dark:border-slate-800">
                Participation rewards are awarded automatically upon verified submission.
              </p>
            </div>

            {/* Ecosystem Stats */}
            <div className="card-high-signal p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Account Activity
                </span>
                <Clock size={16} className="text-blue-500" />
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Total Transactions</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {transactions.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Completed Surveys</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {transactions.filter((t) => t.type === 'survey_completion').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Milestones Earned</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {transactions.filter((t) => t.type === 'creator_milestone').length}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>Zero inflation ledger</span>
              </div>
            </div>
          </div>

          {/* Perks & Utility Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Perks & Utilities
                </h2>
                <p className="text-xs text-slate-500">
                  Redeem {'{{coins}}'} for survey visibility boosts and creator features.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Perk 1: Promote Survey */}
              <div className="card-high-signal p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                      Creator Spotlight
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                      25 {'{{coins}}'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Promote Active Survey to 🔥 Hot Tab
                  </h3>
                  <p className="text-xs text-slate-500">
                    Places your current active survey at top ranking in the discovery feed for 24 hours to maximize respondent reach.
                  </p>
                </div>

                <button
                  onClick={() => handleRedeemPerk(25, 'Promote Active Survey to Hot Tab')}
                  disabled={perkLoading !== null || !balance || balance < 25}
                  className="btn-secondary text-xs py-2 w-full flex items-center justify-center gap-1.5"
                >
                  <Flame size={13} className="text-orange-500" />
                  {perkLoading === 'Promote Active Survey to Hot Tab'
                    ? 'Processing...'
                    : 'Redeem (25 {{coins}})'}
                </button>
              </div>

              {/* Perk 2: Contributor Badge */}
              <div className="card-high-signal p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Community Status
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                      50 {'{{coins}}'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Verified Consensus Contributor Badge
                  </h3>
                  <p className="text-xs text-slate-500">
                    Displays a verified badge next to your profile across public results, discussion threads, and survey creator cards.
                  </p>
                </div>

                <button
                  onClick={() => handleRedeemPerk(50, 'Verified Consensus Contributor Badge')}
                  disabled={perkLoading !== null || !balance || balance < 50}
                  className="btn-secondary text-xs py-2 w-full flex items-center justify-center gap-1.5"
                >
                  <Award size={13} className="text-blue-500" />
                  {perkLoading === 'Verified Consensus Contributor Badge'
                    ? 'Processing...'
                    : 'Redeem (50 {{coins}})'}
                </button>
              </div>
            </div>
          </div>

          {/* Full Transaction Ledger */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Transaction Ledger
              </h2>
              <span className="text-xs font-mono text-slate-500">
                {transactions.length} recorded events
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="card-high-signal p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-xs text-slate-500">No transactions recorded yet.</p>
                <p className="text-xs text-slate-400">
                  Complete your first opinion poll or personality test to begin earning {'{{coins}}'}.
                </p>
                <Link href="/" className="btn-primary text-xs mt-3 inline-block">
                  Browse Surveys
                </Link>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((tx) => {
                      const isPositive = tx.amount > 0;
                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                tx.type === 'survey_completion'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                  : tx.type === 'creator_milestone'
                                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                  : tx.type === 'daily_streak'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {tx.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                            {tx.description || 'System reward'}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 ${
                                isPositive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                              {isPositive ? `+${tx.amount}` : tx.amount} {'{{coins}}'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
