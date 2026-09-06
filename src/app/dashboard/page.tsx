'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { checkResultsUnlockStatus, UnlockStatus } from '@/lib/results-unlock';
import { Survey, Question } from '@/db/schema';
import {
  updateSurveyStatusAction,
  deleteSurveyAction,
  toggleResultsUnlockAction,
} from '@/actions/survey-actions';
import { ShareModal } from '@/components/survey/share-modal';
import {
  Search,
  Filter,
  Eye,
  BarChart2,
  Share2,
  Trash2,
  CheckCircle2,
  Lock,
  Unlock,
  Sparkles,
  Brain,
  RefreshCw,
  Award,
  Zap,
  Users,
  X,
} from 'lucide-react';

interface SurveyWithStats extends Survey {
  responsesCount: number;
  questionsCount: number;
  unlockStatus: UnlockStatus;
}

export default function CreatorDashboardPage() {
  const { data: session } = useSession();
  const [surveys, setSurveys] = useState<SurveyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedShareSurvey, setSelectedShareSurvey] = useState<SurveyWithStats | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = session?.user;

  const fetchCreatorSurveys = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/surveys/creator');
      if (res.ok) {
        const data = await res.json();
        setSurveys(data.surveys || []);
      }
    } catch (err) {
      console.error('Failed to fetch surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatorSurveys();
  }, [currentUser?.email]);

  const handleStatusChange = async (
    surveyId: string,
    newStatus: 'draft' | 'active' | 'closed'
  ) => {
    setActionError(null);
    const res = await updateSurveyStatusAction(surveyId, newStatus);
    if (res.success) {
      await fetchCreatorSurveys();
    } else {
      setActionError(res.error || 'Failed to update status');
    }
  };

  const handleToggleUnlock = async (surveyId: string) => {
    setActionError(null);
    const res = await toggleResultsUnlockAction(surveyId);
    if (res.success) {
      await fetchCreatorSurveys();
    } else {
      setActionError(res.error || 'Failed to toggle results release');
    }
  };

  const handleDelete = async (surveyId: string) => {
    if (confirm('Are you sure you want to permanently delete this survey and all responses?')) {
      setActionError(null);
      const res = await deleteSurveyAction(surveyId);
      if (res.success) {
        await fetchCreatorSurveys();
      } else {
        setActionError(res.error || 'Failed to delete survey');
      }
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const totalSurveys = surveys.length;
    const activeSurvey = surveys.find((s) => s.status === 'active');
    const totalResponses = surveys.reduce((sum, s) => sum + (s.responsesCount || 0), 0);
    const totalCoinsGiven = surveys.reduce(
      (sum, s) => sum + (s.responsesCount || 0) * (s.coinsReward || 10),
      0
    );

    const activeCount = surveys.filter((s) => s.status === 'active').length;
    const draftCount = surveys.filter((s) => s.status === 'draft').length;
    const closedCount = surveys.filter((s) => s.status === 'closed').length;

    return {
      totalSurveys,
      activeSurvey,
      totalResponses,
      totalCoinsGiven,
      activeCount,
      draftCount,
      closedCount,
    };
  }, [surveys]);

  // Filtered Surveys
  const filteredSurveys = useMemo(() => {
    let list = [...surveys];

    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [surveys, statusFilter, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="badge-minimal">Creator Studio</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {currentUser ? `${currentUser.name}’s Workspace` : 'Creator Workspace'}
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {currentUser
              ? `Account: ${currentUser.email} • Role: ${((currentUser as { role?: string }).role || 'creator').toUpperCase()}`
              : 'Guest Mode: You can build surveys freely. Sign in or register to publish.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!currentUser && (
            <Link href="/auth/signin" className="btn-secondary text-xs">
              Sign In / Register
            </Link>
          )}
          <Link href="/dashboard/new" className="btn-primary text-xs shadow-sm">
            + Create New Survey
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Slot Card */}
        <div className="card-high-signal p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Survey Slot
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                kpis.activeSurvey ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            ></span>
          </div>
          <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100 block">
            {kpis.activeSurvey ? '1 / 1 Used' : '0 / 1 Free'}
          </span>
          <p className="text-[11px] text-slate-500 truncate">
            {kpis.activeSurvey ? `"${kpis.activeSurvey.title}"` : 'Publish a draft survey'}
          </p>
        </div>

        {/* Responses Harvested */}
        <div className="card-high-signal p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Submissions
            </span>
            <Users size={14} className="text-blue-500" />
          </div>
          <span className="text-2xl font-extrabold font-mono text-blue-600 dark:text-blue-400 block">
            {kpis.totalResponses}
          </span>
          <p className="text-[11px] text-slate-500">Across all created surveys</p>
        </div>

        {/* Rewards Distributed */}
        <div className="card-high-signal p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Distributed {'{{coins}}'}
            </span>
            <Award size={14} className="text-amber-500" />
          </div>
          <span className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400 block">
            🪙 {kpis.totalCoinsGiven}
          </span>
          <p className="text-[11px] text-slate-500">Credited to verified voters</p>
        </div>

        {/* Total Surveys */}
        <div className="card-high-signal p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Surveys
            </span>
            <BarChart2 size={14} className="text-purple-500" />
          </div>
          <span className="text-2xl font-extrabold font-mono text-purple-600 dark:text-purple-400 block">
            {kpis.totalSurveys}
          </span>
          <p className="text-[11px] text-slate-500">
            {kpis.activeCount} active • {kpis.draftCount} drafts • {kpis.closedCount} closed
          </p>
        </div>
      </div>

      {/* Surveys List Section */}
      <div className="space-y-4">
        {/* Filter Controls: Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All ({surveys.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'active'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Active ({kpis.activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'draft'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Drafts ({kpis.draftCount})
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'closed'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Closed ({kpis.closedCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search surveys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={fetchCreatorSurveys}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 transition-colors"
              title="Refresh Survey List"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card-high-signal text-center py-16">
            <p className="text-xs text-slate-500">Loading your workspace surveys...</p>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div className="card-high-signal text-center py-16 space-y-3">
            <p className="text-xs text-slate-500">
              {searchQuery || statusFilter !== 'all'
                ? 'No surveys match the selected filter or search term.'
                : 'You have not created any surveys yet.'}
            </p>
            {searchQuery || statusFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="btn-secondary text-xs inline-block"
              >
                Clear Filters
              </button>
            ) : (
              <Link href="/dashboard/new" className="btn-primary text-xs mt-3 inline-block">
                Create First Survey
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSurveys.map((survey) => {
              const isUnlocked = survey.unlockStatus?.isUnlocked;
              const isPersonality = survey.surveyType === 'personality';

              return (
                <div
                  key={survey.id}
                  className="card-high-signal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Tag */}
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                          survey.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : survey.status === 'draft'
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        ● {survey.status.toUpperCase()}
                      </span>

                      {/* Format Tag */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 flex items-center gap-1">
                        {isPersonality ? <Brain size={11} /> : <BarChart2 size={11} />}
                        {isPersonality ? 'Personality Test' : 'Opinion Poll'}
                      </span>

                      {/* Visibility Tag */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {survey.visibility === 'private'
                          ? '🔒 Private'
                          : survey.visibility === 'respondents_only'
                          ? '📋 Respondents Only'
                          : '🌐 Public'}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        +{survey.coinsReward || 10} {'{{coins}}'}
                      </span>

                      <span className="text-[11px] font-mono text-slate-400">
                        Created {new Date(survey.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {survey.title}
                    </h3>

                    <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>{survey.questionsCount} Questions</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {survey.responsesCount} Submissions
                      </span>
                      <span>•</span>
                      <span>
                        Release Rule:{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {survey.resultsUnlockConfig?.type}
                        </span>
                      </span>
                    </p>
                  </div>

                  {/* Actions & Lifecycle Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Dropdown */}
                    <select
                      value={survey.status}
                      onChange={(e) =>
                        handleStatusChange(
                          survey.id,
                          e.target.value as 'draft' | 'active' | 'closed'
                        )
                      }
                      className="p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active (Live)</option>
                      <option value="closed">Closed</option>
                    </select>

                    {/* Results Unlock Toggle */}
                    <button
                      onClick={() => handleToggleUnlock(survey.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                        isUnlocked
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isUnlocked ? <CheckCircle2 size={12} /> : <Lock size={12} />}
                      {isUnlocked ? 'Unlocked' : 'Release Results'}
                    </button>

                    {/* Preview Button */}
                    <Link
                      href={`/surveys/${survey.id}`}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                    >
                      <Eye size={13} />
                      Preview
                    </Link>

                    {/* Analytics Button */}
                    <Link
                      href={`/surveys/${survey.id}/results`}
                      className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm"
                    >
                      <BarChart2 size={13} />
                      Analytics
                    </Link>

                    {/* Share Modal Trigger */}
                    <button
                      onClick={() => setSelectedShareSurvey(survey)}
                      className="btn-secondary text-xs p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      title="Share Survey Link & QR"
                    >
                      <Share2 size={14} />
                    </button>

                    {/* Delete Survey Button */}
                    <button
                      onClick={() => handleDelete(survey.id)}
                      className="p-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-transparent transition-colors"
                      title="Delete Survey"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedShareSurvey && (
        <ShareModal
          surveyId={selectedShareSurvey.id}
          surveyTitle={selectedShareSurvey.title}
          surveyType={selectedShareSurvey.surveyType}
          isOpen={true}
          onClose={() => setSelectedShareSurvey(null)}
        />
      )}
    </div>
  );
}

