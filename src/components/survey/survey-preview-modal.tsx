'use client';

import React, { useState } from 'react';
import { X, Eye, ArrowRight, RotateCcw, Award, Brain, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PersonalityArchetype } from '@/db/schema';
import { calculatePersonalityOutcome, PersonalityOutcomeResult } from '@/lib/survey-engine';

export interface PreviewOption {
  id: string;
  text: string;
  archetypeWeights?: Record<string, number>;
}

export interface PreviewQuestion {
  tempId: string;
  text: string;
  isDemographicFlag: boolean;
  demographicType?: string;
  options: PreviewOption[];
}

interface SurveyPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyType: 'poll' | 'personality';
  title: string;
  description: string;
  coinsReward: number;
  archetypes: PersonalityArchetype[];
  questions: PreviewQuestion[];
}

export const SurveyPreviewModal: React.FC<SurveyPreviewModalProps> = ({
  isOpen,
  onClose,
  surveyType,
  title,
  description,
  coinsReward,
  archetypes,
  questions,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([0]);
  const [completed, setCompleted] = useState<boolean>(false);
  const [outcome, setOutcome] = useState<PersonalityOutcomeResult | null>(null);

  if (!isOpen) return null;

  const validQuestions = questions.filter((q) => q.text.trim().length > 0);
  const currentQ = validQuestions[currentIndex];

  const handleSelectOption = (optId: string) => {
    setSelectedOptionId(optId);
  };

  const handleNext = () => {
    if (!currentQ || !selectedOptionId) return;

    const updatedAnswers = {
      ...answers,
      [currentQ.tempId]: selectedOptionId,
    };
    setAnswers(updatedAnswers);

    if (history.length >= validQuestions.length) {
      // Completed survey in preview
      if (surveyType === 'personality' && archetypes.length > 0) {
        // Map to format required by calculatePersonalityOutcome
        const engineQuestions = validQuestions.map((q, idx) => ({
          id: q.tempId,
          surveyId: 'preview',
          orderIndex: idx,
          text: q.text,
          questionType: 'single_choice' as const,
          isDemographicFlag: q.isDemographicFlag,
          demographicType: q.demographicType || null,
          options: q.options.map((o) => ({
            id: o.id,
            text: o.text,
            archetypeWeights: o.archetypeWeights,
          })),
          createdAt: new Date(),
        }));

        const result = calculatePersonalityOutcome(engineQuestions, updatedAnswers, archetypes);
        setOutcome(result);
      }
      setCompleted(true);
    } else {
      const nextIdx = currentIndex + 1;
      setHistory((prev) => [...prev, nextIdx]);
      setCurrentIndex(nextIdx);
      setSelectedOptionId(updatedAnswers[validQuestions[nextIdx]?.tempId] || null);
    }
  };

  const handleBack = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop();
    const prevIdx = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    setCurrentIndex(prevIdx);
    const prevQId = validQuestions[prevIdx]?.tempId;
    setSelectedOptionId(answers[prevQId] || null);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnswers({});
    setSelectedOptionId(null);
    setHistory([0]);
    setCompleted(false);
    setOutcome(null);
  };

  const progressPercent =
    validQuestions.length > 0
      ? Math.round(((history.length - 1) / validQuestions.length) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="card-high-signal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Top Banner: Preview Mode Pill & Close */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
              <Eye size={12} />
              Interactive Preview Mode
            </span>
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              Testing respondent experience
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X size={18} />
          </button>
        </div>

        {validQuestions.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <ShieldAlert size={32} className="text-amber-500 mx-auto" />
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              No Questions Configured Yet
            </p>
            <p className="text-xs text-slate-500">
              Add at least one question and options in the builder to test run the preview.
            </p>
          </div>
        ) : completed ? (
          /* COMPLETION PREVIEW */
          <div className="space-y-6 text-center py-4">
            {surveyType === 'personality' && outcome?.winningArchetype ? (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto text-xl font-bold">
                  <Brain size={28} />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Your Archetype Result
                  </span>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {outcome.winningArchetype.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                    {outcome.winningArchetype.description}
                  </p>
                </div>

                {/* Archetype traits */}
                {outcome.winningArchetype.traits && (
                  <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                    {outcome.winningArchetype.traits.map((trait) => (
                      <span
                        key={trait}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                )}

                {/* Coin Reward Banner */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 font-mono max-w-sm mx-auto">
                  <Award size={14} className="text-amber-500" />
                  <span>+{coinsReward} {'{{coins}}'} reward simulated</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    Response Recorded
                  </h3>
                  <p className="text-xs text-slate-500">
                    Thank you for contributing to this community consensus poll.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 font-mono max-w-sm mx-auto">
                  <Award size={14} className="text-amber-500" />
                  <span>+{coinsReward} {'{{coins}}'} credited to respondent</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleRestart}
                className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                Test Another Path
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary text-xs py-2 px-4"
              >
                Done Previewing
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE RUNNER PREVIEW */
          <div className="space-y-5">
            {/* Progress */}
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>
                Question {currentIndex + 1} of {validQuestions.length}
              </span>
              <span>{progressPercent}% Complete</span>
            </div>

            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>

            {/* Question Text */}
            <div className="space-y-1">
              {currentQ.isDemographicFlag && (
                <span className="badge-minimal">Demographic Calibration</span>
              )}
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {currentQ.text}
              </h3>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full p-3.5 text-left rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-1 ring-blue-600'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-medium">{opt.text || `Option ${idx + 1}`}</span>
                    </div>

                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <div className="w-1 h-1 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              {history.length > 1 ? (
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
                disabled={!selectedOptionId}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                {history.length === validQuestions.length ? (
                  <>Complete Preview ✓</>
                ) : (
                  <>Next Question →</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
