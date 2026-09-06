'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Award, Share2, ArrowRight, Brain, CheckCircle2, RotateCcw } from 'lucide-react';
import { Survey, Question, QuestionOption, PersonalityArchetype } from '@/db/schema';
import { getNextQuestionId, calculatePersonalityOutcome, PersonalityOutcomeResult } from '@/lib/survey-engine';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { submitResponseAction } from '@/actions/survey-actions';
import { ShareModal } from './share-modal';

interface SurveyRunnerProps {
  survey: Survey;
  questions: Question[];
}

export const SurveyRunner: React.FC<SurveyRunnerProps> = ({ survey, questions }) => {
  const router = useRouter();

  const sortedQuestions = [...questions].sort((a, b) => a.orderIndex - b.orderIndex);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [historyPath, setHistoryPath] = useState<number[]>([0]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [fingerprintHash, setFingerprintHash] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completed, setCompleted] = useState<boolean>(false);

  // Completion results state
  const [personalityOutcome, setPersonalityOutcome] = useState<PersonalityOutcomeResult | null>(null);
  const [awardedCoins, setAwardedCoins] = useState<number>(survey.coinsReward || 10);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Device & environment metadata
  const [clientTimezone, setClientTimezone] = useState<string>('UTC');
  const [browserLanguage, setBrowserLanguage] = useState<string>('en');
  const [deviceType, setDeviceType] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      setClientTimezone(tz);
      const lang = navigator.language || navigator.languages?.[0] || 'en';
      setBrowserLanguage(lang);

      const ua = navigator.userAgent || '';
      const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua);
      const isMobile =
        /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
          ua
        );
      setDeviceType(isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop');

      const rawFp = [
        ua,
        lang,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
      ].join('||');

      let hash = 0;
      for (let i = 0; i < rawFp.length; i++) {
        const char = rawFp.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      setFingerprintHash(`fp_${Math.abs(hash)}`);
    } catch {
      // Fallback
    }
  }, []);

  const currentQuestion = sortedQuestions[currentQuestionIndex];
  const currentOptions = (currentQuestion?.options || []) as QuestionOption[];

  const handleSelectOption = (optionId: string) => {
    setSelectedOptionId(optionId);
    setErrorMsg(null);
  };

  const submitFinalResponse = async (finalAnswers: Record<string, string>) => {
    setSubmitting(true);
    setErrorMsg(null);

    // If personality test, calculate outcome
    let outcome: PersonalityOutcomeResult | null = null;
    let targetArchetypeId: string | null = null;

    if (survey.surveyType === 'personality' && survey.personalityArchetypes?.length) {
      outcome = calculatePersonalityOutcome(
        sortedQuestions,
        finalAnswers,
        survey.personalityArchetypes
      );
      setPersonalityOutcome(outcome);
      targetArchetypeId = outcome.winningArchetype?.id || null;
    }

    const result = await submitResponseAction({
      surveyId: survey.id,
      answers: finalAnswers,
      fingerprintHash: fingerprintHash || `fp_fallback_${Date.now()}`,
      turnstileToken,
      clientTimezone,
      browserLanguage,
      deviceType,
      resultArchetypeId: targetArchetypeId,
    });

    setSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Submission blocked. You may have already taken this survey.');
      return;
    }

    if (result.earnedCoins) {
      setAwardedCoins(result.earnedCoins);
    }

    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch {
      // Confetti fallback
    }

    setCompleted(true);
  };

  const handleNext = useCallback(() => {
    if (!currentQuestion || !selectedOptionId) {
      setErrorMsg('Please select an answer to continue.');
      return;
    }

    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: selectedOptionId,
    };
    setAnswers(updatedAnswers);

    const { nextQuestionId, isCompleted } = getNextQuestionId(
      currentQuestion,
      selectedOptionId,
      sortedQuestions
    );

    if (isCompleted || !nextQuestionId) {
      submitFinalResponse(updatedAnswers);
    } else {
      const nextIndex = sortedQuestions.findIndex((q) => q.id === nextQuestionId);
      if (nextIndex >= 0) {
        setHistoryPath((prev) => [...prev, nextIndex]);
        setCurrentQuestionIndex(nextIndex);
        setSelectedOptionId(updatedAnswers[sortedQuestions[nextIndex].id] || null);
      } else {
        submitFinalResponse(updatedAnswers);
      }
    }
  }, [answers, currentQuestion, selectedOptionId, sortedQuestions, fingerprintHash, turnstileToken]);

  const handleBack = () => {
    if (historyPath.length <= 1) return;
    const newHistory = [...historyPath];
    newHistory.pop();
    const prevIndex = newHistory[newHistory.length - 1];
    setHistoryPath(newHistory);
    setCurrentQuestionIndex(prevIndex);
    const prevQId = sortedQuestions[prevIndex]?.id;
    setSelectedOptionId(answers[prevQId] || null);
  };

  // Keyboard shortcuts (1-9, Enter, Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completed || submitting) return;

      const keyNum = parseInt(e.key, 10);
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= currentOptions.length) {
        e.preventDefault();
        handleSelectOption(currentOptions[keyNum - 1].id);
      } else if (e.key === 'Enter' && selectedOptionId) {
        e.preventDefault();
        handleNext();
      } else if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && historyPath.length > 1) {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completed, submitting, currentOptions, selectedOptionId, historyPath, handleNext]);

  // COMPLETE STATE: Outcome Card & Reward Summary
  if (completed) {
    const isPersonality = survey.surveyType === 'personality' && personalityOutcome?.winningArchetype;
    const winningArch = personalityOutcome?.winningArchetype;

    return (
      <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
        {/* Outcome Card */}
        {isPersonality && winningArch ? (
          <div className="card-high-signal p-8 rounded-2xl border-2 border-purple-500/40 bg-gradient-to-b from-purple-50/30 to-white dark:from-purple-950/20 dark:to-slate-900 space-y-6 text-center shadow-xl">
            <div className="space-y-2">
              <span className="badge-minimal bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                Your Assessment Archetype
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                {winningArch.title}
              </h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
              {winningArch.description}
            </p>

            {winningArch.traits && winningArch.traits.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {winningArch.traits.map((trait) => (
                  <span
                    key={trait}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200"
                  >
                    #{trait}
                  </span>
                ))}
              </div>
            )}

            {/* Coins Earned Notification */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 font-mono">
              <Award size={15} className="text-amber-500" />
              <span>+{awardedCoins} {'{{coins}}'} credited to your wallet</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="btn-primary text-xs py-2.5 px-4 w-full sm:flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Share2 size={14} />
                Share My Result
              </button>

              <Link
                href={`/surveys/${survey.id}/results`}
                className="btn-secondary text-xs py-2.5 px-4 w-full sm:flex-1 text-center flex items-center justify-center gap-1.5"
              >
                View Full Results
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ) : (
          /* Standard Poll Completion Screen */
          <div className="card-high-signal p-8 rounded-2xl text-center space-y-6 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                Response Recorded
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Thank you for contributing to this community consensus poll.
              </p>
            </div>

            {/* Coins Earned Chip */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 font-mono">
              <Award size={15} className="text-amber-500" />
              <span>+{awardedCoins} {'{{coins}}'} credited to your wallet</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="btn-secondary text-xs py-2.5 px-4 w-full sm:flex-1 flex items-center justify-center gap-2"
              >
                <Share2 size={14} />
                Share Survey
              </button>

              <Link
                href={`/surveys/${survey.id}/results`}
                className="btn-primary text-xs py-2.5 px-4 w-full sm:flex-1 text-center flex items-center justify-center gap-1.5"
              >
                Explore Consensus Results
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}

        {/* Share Dialog */}
        <ShareModal
          surveyId={survey.id}
          surveyTitle={survey.title}
          surveyType={survey.surveyType}
          outcomeTitle={personalityOutcome?.winningArchetype?.title}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      </div>
    );
  }

  const progressPercent = Math.round(((historyPath.length - 1) / sortedQuestions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Bar & Header */}
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
        <span>
          Question {currentQuestionIndex + 1} of {sortedQuestions.length}
        </span>
        <span>{progressPercent}% Complete</span>
      </div>

      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
          style={{ width: `${Math.max(5, progressPercent)}%` }}
        />
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Question Card */}
      {currentQuestion && (
        <div className="card-high-signal p-6 rounded-xl space-y-6 border border-slate-200 dark:border-slate-800">
          {/* Question Text */}
          <div className="space-y-1.5">
            {currentQuestion.isDemographicFlag && (
              <span className="badge-minimal">Demographic Calibration</span>
            )}
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {currentQuestion.text}
            </h2>
          </div>

          {/* Options Grid */}
          <div className="space-y-2.5">
            {currentOptions.map((opt, idx) => {
              const isSelected = selectedOptionId === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full p-4 text-left rounded-xl border text-sm transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-1 ring-blue-600 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-medium leading-relaxed">{opt.text}</span>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Turnstile Bot Protection on Last Question */}
          {historyPath.length === sortedQuestions.length && (
            <div className="pt-2">
              <TurnstileWidget onVerify={(token) => setTurnstileToken(token)} />
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {historyPath.length > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={submitting || !selectedOptionId}
              className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2"
            >
              {submitting ? (
                'Recording...'
              ) : historyPath.length === sortedQuestions.length ? (
                <>Submit Response ✓</>
              ) : (
                <>Next Question →</>
              )}
            </button>
          </div>

          {/* Desktop Keyboard Helper */}
          <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono pt-1">
            <span>
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">1</kbd> - <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">{currentOptions.length}</kbd> to select
            </span>
            <span>
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">Enter ↵</kbd> to proceed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
