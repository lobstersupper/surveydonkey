'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { checkResultsUnlockStatus, UnlockStatus } from '@/lib/results-unlock';
import { Survey, Question } from '@/db/schema';
import {
  updateSurveyStatusAction,
  deleteSurveyAction,
  toggleResultsUnlockAction,
} from '@/actions/survey-actions';

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

  const activeSurvey = surveys.find((s) => s.status === 'active');

  return (
    <div className="space-y-10">
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
          <Link href="/dashboard/new" className="btn-primary text-xs">
            + Create New Survey
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* 1 Active Survey Limit Monitor Banner */}
      <div className="card-high-signal bg-slate-900 text-white p-6 rounded-lg flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
            Survey Limits & Usage
          </span>
          <h3 className="text-base font-bold mt-1">
            Active Survey Status: {activeSurvey ? `"${activeSurvey.title}"` : 'None Active'}
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Standard creators can publish 1 active survey at a time.
          </p>
        </div>

        <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-xs font-bold text-slate-200">
          {activeSurvey ? '1 / 1 Active Slot Used' : '0 / 1 Active Slot Used'}
        </div>
      </div>

      {/* Surveys List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Your Created Surveys ({surveys.length})
          </h2>
          <button
            onClick={fetchCreatorSurveys}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="card-high-signal text-center py-12">
            <p className="text-xs text-slate-500">Loading your workspace surveys...</p>
          </div>
        ) : surveys.length === 0 ? (
          <div className="card-high-signal text-center py-12">
            <p className="text-xs text-slate-500">You have not created any surveys yet.</p>
            <Link href="/dashboard/new" className="btn-primary text-xs mt-3 inline-block">
              Create First Survey
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {surveys.map((survey) => {
              const isUnlocked = survey.unlockStatus?.isUnlocked;

              return (
                <div
                  key={survey.id}
                  className="card-high-signal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
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

                      <span className="text-[11px] font-mono text-slate-400">
                        Created {new Date(survey.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {survey.title}
                    </h3>

                    <p className="text-xs text-slate-500">
                      {survey.questionsCount} Questions • {survey.responsesCount} Submissions • Unlock Rule:{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {survey.resultsUnlockConfig?.type}
                      </span>
                    </p>
                  </div>

                  {/* Actions & Lifecycle Toggles */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Lifecycle Dropdown */}
                    <select
                      value={survey.status}
                      onChange={(e) =>
                        handleStatusChange(
                          survey.id,
                          e.target.value as 'draft' | 'active' | 'closed'
                        )
                      }
                      className="p-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active (Live)</option>
                      <option value="closed">Closed / Archived</option>
                    </select>

                    <button
                      onClick={() => handleToggleUnlock(survey.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded border transition-all ${
                        isUnlocked
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isUnlocked ? '✓ Unlocked' : '🔒 Release Results'}
                    </button>

                    <Link href={`/surveys/${survey.id}`} className="btn-secondary text-xs">
                      Preview
                    </Link>

                    <Link href={`/surveys/${survey.id}/results`} className="btn-primary text-xs">
                      Analytics
                    </Link>

                    <button
                      onClick={() => handleDelete(survey.id)}
                      className="px-2.5 py-2 text-xs text-red-600 hover:bg-red-50 rounded border border-transparent dark:hover:bg-red-950/40"
                      title="Delete Survey"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
