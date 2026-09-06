import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { surveyRepository } from '@/lib/repository';
import { checkResultsUnlockStatus } from '@/lib/results-unlock';
import { ResultsView } from '@/components/charts/results-view';
import { ResultsUnlockSubscriber } from '@/components/survey/results-unlock-subscriber';

export const dynamic = 'force-dynamic';

export default async function SurveyResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('sd_session')?.value;

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

  const isCreator = Boolean(session?.user?.id && session.user.id === survey.creatorId);
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === 'superadmin';

  // 1. Check Private Visibility
  if (survey.visibility === 'private' && !isCreator && !isSuperAdmin) {
    return (
      <div className="card-high-signal text-center py-16 max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto text-xl font-bold">
          🔒
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Private Survey</h2>
        <p className="text-xs text-slate-500">
          The creator has configured the results of this survey as private.
        </p>
        <Link href="/" className="btn-primary text-xs inline-block">
          Return to Feed
        </Link>
      </div>
    );
  }

  const questions = await surveyRepository.getQuestionsBySurvey(id);
  const responses = await surveyRepository.getResponsesBySurvey(id);
  const crossSurveyStats = await surveyRepository.getCrossSurveyStats(id);

  // Find user's own response if exists
  const userResponse = responses.find(
    (r) =>
      (session?.user?.id && r.userId === session.user.id) ||
      (sessionCookie && r.sessionCookie === sessionCookie)
  ) || null;

  // 2. Check Respondents-Only Visibility
  if (
    survey.visibility === 'respondents_only' &&
    !userResponse &&
    !isCreator &&
    !isSuperAdmin
  ) {
    return (
      <div className="card-high-signal text-center py-16 max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-xl font-bold">
          📋
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Respondents-Only Results
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The creator has configured results to unlock exclusively after you participate.
          Complete the {survey.surveyType === 'personality' ? 'test' : 'survey'} to view collective insights.
        </p>
        <Link href={`/surveys/${survey.id}`} className="btn-primary text-xs inline-block">
          Take {survey.surveyType === 'personality' ? 'Test' : 'Survey'} →
        </Link>
      </div>
    );
  }

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
            {survey.surveyType === 'personality' ? 'Personality Assessment Insights' : 'Public Consensus Insights'}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{survey.title}</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
          {responses.length} Total Verified Responses
        </p>
      </div>

      {/* LOCKED BANNER (if locked and viewer is neither creator nor admin) */}
      {!unlockStatus.isUnlocked && !isCreator && !isSuperAdmin ? (
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
                {unlockStatus.currentResponses} / {unlockStatus.requiredResponses || 'Target'} (
                {unlockStatus.progressPercent}%)
              </span>
            </div>

            <div className="h-3 w-full bg-amber-200/60 dark:bg-amber-900/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 dark:bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.max(5, unlockStatus.progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Email Notification Signup */}
          <ResultsUnlockSubscriber surveyId={survey.id} />
        </div>
      ) : (
        /* UNLOCKED RESULTS VIEW */
        <ResultsView
          survey={survey}
          questions={questions}
          responses={responses}
          crossSurveyStats={crossSurveyStats}
          userResponse={userResponse}
        />
      )}
    </div>
  );
}
