'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { surveyStore } from '@/lib/store';
import { SurveyRunner } from '@/components/survey/survey-runner';

export default function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const survey = surveyStore.getSurveyById(id);
  const questions = surveyStore.getQuestionsBySurvey(id);

  if (!survey) {
    return (
      <div className="card-high-signal text-center py-16 max-w-lg mx-auto space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Survey Not Found</h2>
        <p className="text-xs text-slate-500">The survey identifier is invalid or has been deleted.</p>
        <Link href="/" className="btn-primary text-xs inline-block">
          Return to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-2">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xs text-slate-400 hover:underline">
            ← Back to Feed
          </Link>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Anonymous Respondent View
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{survey.title}</h1>
        {survey.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">{survey.description}</p>
        )}
      </div>

      {/* Survey Question Runner */}
      <SurveyRunner survey={survey} questions={questions} />
    </div>
  );
}
