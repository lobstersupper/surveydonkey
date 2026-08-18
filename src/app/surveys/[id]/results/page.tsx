import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { surveyRepository } from '@/lib/repository';
import { checkResultsUnlockStatus } from '@/lib/results-unlock';
import { ConsensusDashboard } from '@/components/charts/consensus-dashboard';
import { D3DemographicCluster } from '@/components/charts/d3-demographic-cluster';
import { ResultsUnlockSubscriber } from '@/components/survey/results-unlock-subscriber';

export const dynamic = 'force-dynamic';

export default async function SurveyResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const survey = await surveyRepository.getSurveyById(id);
  if (!survey) {
    return (
      <div className="card-high-signal text-center py-16 max-w-lg mx-auto space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Survey Not Found</h2>
        <Link href="/" className="btn-primary text-xs inline-block">
          Return to Feed
        </Link>
      </div>
    );
  }

  const questions = await surveyRepository.getQuestionsBySurvey(id);
  const responses = await surveyRepository.getResponsesBySurvey(id);

  const unlockStatus = checkResultsUnlockStatus(survey.resultsUnlockConfig, responses.length);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-2">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xs text-slate-400 hover:underline">
            ← Back to Feed
          </Link>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Survey Results & Insights
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{survey.title}</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
          {responses.length} Total Responses
        </p>
      </div>

      {/* LOCKED BANNER */}
      {!unlockStatus.isUnlocked ? (
        <div className="card-high-signal bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-8 rounded-lg max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300">
            <span className="text-2xl">🔒</span>
            <div>
              <h2 className="text-lg font-bold">Results Currently Locked</h2>
              <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-400">
                {unlockStatus.reason}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
              <span>Collection Progress</span>
              <span>
                {unlockStatus.currentResponses} / {unlockStatus.requiredResponses || 'Target'} ({unlockStatus.progressPercent}%)
              </span>
            </div>

            <div className="h-3 w-full bg-amber-200/60 dark:bg-amber-900/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 dark:bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.max(5, unlockStatus.progressPercent)}%` }}
              ></div>
            </div>
          </div>

          {/* Email Notification Signup */}
          <ResultsUnlockSubscriber surveyId={survey.id} />
        </div>
      ) : (
        /* UNLOCKED FULL DASHBOARD */
        <div className="space-y-12">
          {/* Section 1: Interactive Demographic Cluster */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Demographic Distribution
            </h2>
            <D3DemographicCluster questions={questions} responses={responses} />
          </div>

          {/* Section 2: Question Metrics Breakdown */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Responses Breakdown
            </h2>
            <ConsensusDashboard questions={questions} responses={responses} />
          </div>
        </div>
      )}
    </div>
  );
}
