import React from 'react';
import Link from 'next/link';
import { surveyRepository } from '@/lib/repository';
import { checkResultsUnlockStatus } from '@/lib/results-unlock';
import { HotSurveysFeed } from '@/components/survey/hot-surveys-feed';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const surveys = await surveyRepository.getActiveSurveys();

  const now = Date.now();
  const twoDaysAgo = now - 48 * 60 * 60 * 1000;

  const enrichedSurveys = await Promise.all(
    surveys.map(async (survey) => {
      const responses = await surveyRepository.getResponsesBySurvey(survey.id);
      const questions = await surveyRepository.getQuestionsBySurvey(survey.id);
      const unlockStatus = checkResultsUnlockStatus(
        survey.resultsUnlockConfig,
        responses.length
      );

      const recentResponsesCount = responses.filter(
        (r) => new Date(r.submittedAt).getTime() >= twoDaysAgo
      ).length;

      const score = recentResponsesCount * 3 + responses.length;

      return {
        ...survey,
        responsesCount: responses.length,
        questionsCount: questions.length,
        unlockStatus,
        score,
        isHot: score >= 10 || recentResponsesCount >= 4,
      };
    })
  );

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="badge-minimal">Live Community Feed</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Surveys & Personality Tests
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            Participate in opinion polls and personality quizzes, unlock collective insights, and earn{' '}
            {'{{coins}}'}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/new" className="btn-primary text-xs shadow-sm hover:shadow">
            + Create Survey or Test
          </Link>
        </div>
      </div>

      {/* Discovery Feed */}
      <HotSurveysFeed initialSurveys={enrichedSurveys} />
    </div>
  );
}
