'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { surveyStore } from '@/lib/store';
import { checkResultsUnlockStatus } from '@/lib/results-unlock';

export default function HomePage() {
  const [surveys] = useState(surveyStore.getSurveys().filter((s) => s.status === 'active'));

  return (
    <div className="space-y-10">
      {/* High-Signal Minimalist Hero */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-8 space-y-3">
        <span className="badge-minimal">High-Signal Consensus Platform</span>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Zero-Fluff Public Surveys & Demographic Infographics
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          Participate anonymously in text-only developer and tech consensus studies. Results unlock when response thresholds are satisfied.
        </p>
      </div>

      {/* Public Active Surveys Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Community Consensus Surveys ({surveys.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {surveys.map((survey) => {
            const responses = surveyStore.getResponsesBySurvey(survey.id);
            const questions = surveyStore.getQuestionsBySurvey(survey.id);
            const unlockStatus = checkResultsUnlockStatus(
              survey.resultsUnlockConfig,
              responses.length
            );

            return (
              <div
                key={survey.id}
                className="card-high-signal flex flex-col justify-between space-y-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">
                      {questions.length} Text Questions
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        unlockStatus.isUnlocked
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {unlockStatus.isUnlocked ? '✓ Results Unlocked' : '🔒 Locked (Delayed)'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {survey.title}
                  </h3>

                  {survey.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {survey.description}
                    </p>
                  )}
                </div>

                {/* Response Count & Unlock Progress Bar */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>{responses.length} Total Respondents</span>
                    <span>{unlockStatus.progressPercent}% Target Reached</span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        unlockStatus.isUnlocked
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : 'bg-indigo-600 dark:bg-indigo-500'
                      }`}
                      style={{ width: `${Math.max(5, unlockStatus.progressPercent)}%` }}
                    ></div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <Link
                      href={`/surveys/${survey.id}`}
                      className="btn-primary text-xs flex-1 text-center"
                    >
                      Take Survey →
                    </Link>

                    <Link
                      href={`/surveys/${survey.id}/results`}
                      className="btn-secondary text-xs text-center"
                    >
                      {unlockStatus.isUnlocked ? 'View Consensus' : 'Check Status'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
