'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Survey, Question, QuestionOption } from '@/db/schema';
import { getNextQuestionId } from '@/lib/survey-engine';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { submitResponseAction } from '@/actions/survey-actions';

interface SurveyRunnerProps {
  survey: Survey;
  questions: Question[];
}

export const SurveyRunner: React.FC<SurveyRunnerProps> = ({ survey, questions }) => {
  const router = useRouter();

  // Questions sorted by orderIndex
  const sortedQuestions = [...questions].sort((a, b) => a.orderIndex - b.orderIndex);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [historyPath, setHistoryPath] = useState<number[]>([0]); // Track question index history for back nav
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [fingerprintHash, setFingerprintHash] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completed, setCompleted] = useState<boolean>(false);

  // Generate lightweight client-side device fingerprint and environment metadata on load
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
      const isMobile = /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua);
      setDeviceType(isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop');

      const rawFp = [
        ua,
        lang,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
      ].join('||');

      // Simple hash string
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

  // Select an Option
  const handleSelectOption = (optionId: string) => {
    setSelectedOptionId(optionId);
    setErrorMsg(null);
  };

  // Submit Final Response to Server Action
  const submitFinalResponse = async (finalAnswers: Record<string, string>) => {
    setSubmitting(true);
    setErrorMsg(null);

    const result = await submitResponseAction({
      surveyId: survey.id,
      answers: finalAnswers,
      fingerprintHash: fingerprintHash || `fp_fallback_${Date.now()}`,
      turnstileToken,
      clientTimezone,
      browserLanguage,
      deviceType,
    });

    setSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Submission blocked. Duplicate attempt detected.');
      return;
    }

    // Trigger celebration confetti animation
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Confetti fallback
    }

    setCompleted(true);

    // Redirect to results after brief pause
    setTimeout(() => {
      router.push(`/surveys/${survey.id}/results`);
      router.refresh();
    }, 1200);
  };

  // Advance to Next Question or Submit
  const handleNext = useCallback(() => {
    if (!currentQuestion || !selectedOptionId) {
      setErrorMsg('Please select an option to continue.');
      return;
    }

    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: selectedOptionId,
    };
    setAnswers(updatedAnswers);

    // Evaluate dynamic logic jump
    const { nextQuestionId, isCompleted } = getNextQuestionId(
      currentQuestion,
      selectedOptionId,
      sortedQuestions
    );

    if (isCompleted || !nextQuestionId) {
      // Complete survey submission
      submitFinalResponse(updatedAnswers);
    } else {
      // Find next question index
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

  // Go Back to Previous Question in Branching Path
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

  // Keyboard Shortcuts (1-9 to select option, Enter to proceed, Escape/Backspace to go back)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completed || submitting) return;

      // Number keys 1-9
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

  if (completed) {
    return (
      <div className="card-high-signal bg-white dark:bg-slate-900 text-center py-12 px-6 rounded-lg max-w-xl mx-auto border border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          ✓
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Response Recorded
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Your answers have been recorded. Redirecting to results...
        </p>
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

      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
          style={{ width: `${Math.max(5, progressPercent)}%` }}
        ></div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Active Question Box */}
      {currentQuestion && (
        <div className="card-high-signal bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-8 shadow-sm">
          {currentQuestion.isDemographicFlag && (
            <span className="badge-minimal mb-3">Demographic Profile</span>
          )}

          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {currentQuestion.text}
          </h2>

          {/* Options List */}
          <div className="space-y-3 mt-6">
            {currentOptions.map((opt, idx) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 rounded-md border text-sm font-medium transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 text-slate-900 ring-2 ring-indigo-600 dark:bg-indigo-950/40 dark:text-white dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span>{opt.text}</span>
                  </div>

                  {isSelected && (
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                      Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Silent Turnstile Verification */}
          <div className="mt-4">
            <TurnstileWidget onVerify={(token) => setTurnstileToken(token)} />
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleBack}
              disabled={historyPath.length <= 1 || submitting}
              className="btn-secondary text-xs disabled:opacity-30"
            >
              ← Back
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">1-{currentOptions.length}</kbd> then <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">Enter ↵</kbd>
              </span>

              <button
                onClick={handleNext}
                disabled={!selectedOptionId || submitting}
                className="btn-primary text-xs"
              >
                {submitting
                  ? 'Submitting...'
                  : historyPath.length >= sortedQuestions.length
                  ? 'Finish Survey →'
                  : 'Next Question →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
