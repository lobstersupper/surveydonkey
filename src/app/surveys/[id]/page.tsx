import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { surveyRepository } from '@/lib/repository';
import { SurveyRunner } from '@/components/survey/survey-runner';
import { CheckCircle2, BarChart2, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SurveyPage({
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
        <p className="text-xs text-slate-500">The survey identifier is invalid or has been deleted.</p>
        <Link href="/" className="btn-primary text-xs inline-block">
          Return to Feed
        </Link>
      </div>
    );
  }

  if (survey.status === 'closed') {
    return (
      <div className="card-high-signal text-center py-16 max-w-lg mx-auto space-y-4 border border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto text-xl font-bold">
          🔒
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Survey Closed
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            This {survey.surveyType === 'personality' ? 'personality test' : 'opinion poll'} has concluded its voting period and is no longer accepting new submissions.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link href="/" className="btn-secondary text-xs">
            Back to Feed
          </Link>
          <Link href={`/surveys/${survey.id}/results`} className="btn-primary text-xs">
            Explore Results →
          </Link>
        </div>
      </div>
    );
  }

  const session = await auth();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('sd_session')?.value;

  const questions = await surveyRepository.getQuestionsBySurvey(id);
  const responses = await surveyRepository.getResponsesBySurvey(id);

  const userResponse = responses.find(
    (r) =>
      (session?.user?.id && r.userId === session.user.id) ||
      (sessionCookie && r.sessionCookie === sessionCookie)
  );

  const userArchetype = userResponse?.resultArchetypeId
    ? survey.personalityArchetypes?.find((a) => a.id === userResponse.resultArchetypeId)
    : null;

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-slate-400 hover:underline">
              ← Back to Feed
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
              {survey.surveyType === 'personality' ? '🧠 Personality Test' : '📊 Opinion Poll'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1">
              <span>🪙</span>
              <span>+{survey.coinsReward || 10} {'{{coins}}'} reward</span>
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{survey.title}</h1>
        {survey.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">{survey.description}</p>
        )}
      </div>

      {/* Already Responded Notification Banner */}
      {userResponse && (
        <div className="card-high-signal p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
              <CheckCircle2 size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  You've already contributed to this {survey.surveyType === 'personality' ? 'test' : 'consensus poll'}
                </span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Submitted on {new Date(userResponse.submittedAt).toLocaleDateString()}.
                {userArchetype && (
                  <span className="font-semibold text-purple-600 dark:text-purple-400 ml-1">
                    Calculated Archetype: {userArchetype.title}
                  </span>
                )}
              </p>
            </div>
          </div>

          <Link
            href={`/surveys/${survey.id}/results`}
            className="btn-primary text-xs py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap self-start sm:self-auto"
          >
            <BarChart2 size={13} />
            Explore Results
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Survey Question Runner */}
      <SurveyRunner survey={survey} questions={questions} />
    </div>
  );
}
