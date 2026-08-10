'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { surveyStore } from '@/lib/store';
import { ResultsUnlockConfig } from '@/db/schema';

interface QuestionDraft {
  tempId: string;
  text: string;
  isDemographicFlag: boolean;
  demographicType?: string;
  options: Array<{ id: string; text: string; nextQuestionId?: string }>;
}

export const SurveyBuilder: React.FC = () => {
  const router = useRouter();
  const currentUser = surveyStore.getCurrentUser();

  const activeSurvey = surveyStore.getActiveSurveyByCreator(currentUser.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [unlockType, setUnlockType] = useState<'immediate' | 'threshold' | 'scheduled' | 'manual'>('threshold');
  const [thresholdCount, setThresholdCount] = useState<number>(50);
  const [unlockAtDate, setUnlockAtDate] = useState<string>('');

  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      tempId: 'q_demo_1',
      text: 'What is your age cohort?',
      isDemographicFlag: true,
      demographicType: 'age',
      options: [
        { id: 'opt_1_1', text: '18 - 29' },
        { id: 'opt_1_2', text: '30 - 44' },
        { id: 'opt_1_3', text: '45+' },
      ],
    },
    {
      tempId: 'q_2',
      text: 'Do you currently leverage autonomous AI coding agents?',
      isDemographicFlag: false,
      options: [
        { id: 'opt_2_1', text: 'Yes, daily in production' },
        { id: 'opt_2_2', text: 'No, evaluating security' },
      ],
    },
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add new question
  const addQuestion = () => {
    const newId = `q_${Date.now()}`;
    setQuestions([
      ...questions,
      {
        tempId: newId,
        text: '',
        isDemographicFlag: false,
        options: [
          { id: `opt_${newId}_1`, text: '' },
          { id: `opt_${newId}_2`, text: '' },
        ],
      },
    ]);
  };

  // Delete question
  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Add option to question
  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    const q = updated[questionIndex];
    const optId = `opt_${q.tempId}_${q.options.length + 1}`;
    q.options.push({ id: optId, text: '' });
    setQuestions(updated);
  };

  // Handle Publish Survey
  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Survey title is required.');
      return;
    }

    if (questions.some((q) => !q.text.trim())) {
      setErrorMsg('All questions must have valid text.');
      return;
    }

    const unlockConfig: ResultsUnlockConfig = {
      type: unlockType,
      thresholdCount: unlockType === 'threshold' ? thresholdCount : undefined,
      unlockAt: unlockType === 'scheduled' ? unlockAtDate : undefined,
      unlocked: unlockType === 'immediate',
    };

    const res = surveyStore.createSurvey({
      title,
      description,
      creatorId: currentUser.id,
      resultsUnlockConfig: unlockConfig,
      questions,
    });

    if (res.success && res.survey) {
      router.push(`/dashboard`);
    } else {
      setErrorMsg(res.error || 'Failed to create survey.');
    }
  };

  return (
    <form onSubmit={handlePublish} className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Platform Economics Notice if Creator already has an Active Survey */}
      {activeSurvey && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs leading-relaxed dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
          <span className="font-bold uppercase tracking-wider block mb-1">
            Platform Limit Notice (1 Active Survey Limit)
          </span>
          You currently have an active survey (<strong>{activeSurvey.title}</strong>). Publishing this new survey will automatically move your existing active survey to <strong>Closed</strong> status to maintain zero-spam community guidelines.
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Survey Title & Description Card */}
      <div className="card-high-signal space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Survey Configuration
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Title (Text Only)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Developer Tooling & Productivity Consensus 2026"
            className="w-full p-3 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Zero-fluff summary describing the scope of this survey..."
            className="w-full p-3 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900"
          ></textarea>
        </div>
      </div>

      {/* Delayed Gratification Results Unlock Config */}
      <div className="card-high-signal space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Results Unlock Rules (Delayed Gratification)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={`p-3 border rounded text-xs cursor-pointer flex flex-col justify-between ${unlockType === 'threshold' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <input
                type="radio"
                name="unlockType"
                checked={unlockType === 'threshold'}
                onChange={() => setUnlockType('threshold')}
              />
              Response Count Threshold
            </div>
            <p className="text-slate-500 mt-1 text-[11px]">Lock results until survey reaches N total respondents.</p>
          </label>

          <label className={`p-3 border rounded text-xs cursor-pointer flex flex-col justify-between ${unlockType === 'immediate' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <input
                type="radio"
                name="unlockType"
                checked={unlockType === 'immediate'}
                onChange={() => setUnlockType('immediate')}
              />
              Immediate Access
            </div>
            <p className="text-slate-500 mt-1 text-[11px]">Unlock results instantly after user submission.</p>
          </label>

          <label className={`p-3 border rounded text-xs cursor-pointer flex flex-col justify-between ${unlockType === 'scheduled' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <input
                type="radio"
                name="unlockType"
                checked={unlockType === 'scheduled'}
                onChange={() => setUnlockType('scheduled')}
              />
              Scheduled Target Date
            </div>
            <p className="text-slate-500 mt-1 text-[11px]">Lock results until specific date & time.</p>
          </label>

          <label className={`p-3 border rounded text-xs cursor-pointer flex flex-col justify-between ${unlockType === 'manual' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <input
                type="radio"
                name="unlockType"
                checked={unlockType === 'manual'}
                onChange={() => setUnlockType('manual')}
              />
              Creator Manual Release
            </div>
            <p className="text-slate-500 mt-1 text-[11px]">Keep results locked until manual creator release.</p>
          </label>
        </div>

        {unlockType === 'threshold' && (
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Required Responses Count
            </label>
            <input
              type="number"
              min={5}
              max={5000}
              value={thresholdCount}
              onChange={(e) => setThresholdCount(parseInt(e.target.value, 10) || 10)}
              className="w-48 p-2 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
        )}
      </div>

      {/* Questions & Dynamic Logic Jumps Editor */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Questions & Logic Jumps ({questions.length})
          </h3>
          <button type="button" onClick={addQuestion} className="btn-secondary text-xs">
            + Add Question
          </button>
        </div>

        {questions.map((q, qIdx) => (
          <div key={q.tempId} className="card-high-signal space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Question {qIdx + 1}
              </span>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(qIdx)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove Question
                </button>
              )}
            </div>

            <div>
              <input
                type="text"
                value={q.text}
                onChange={(e) => {
                  const copy = [...questions];
                  copy[qIdx].text = e.target.value;
                  setQuestions(copy);
                }}
                placeholder="Question Text (e.g. Which framework do you deploy to edge?)"
                className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={q.isDemographicFlag}
                  onChange={(e) => {
                    const copy = [...questions];
                    copy[qIdx].isDemographicFlag = e.target.checked;
                    setQuestions(copy);
                  }}
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Standard Demographic Question Flag
                </span>
              </label>
            </div>

            {/* Options List & Logic Jumps */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Options & Dynamic Logic Branching
              </label>
              {q.options.map((opt, optIdx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-4">{optIdx + 1}.</span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => {
                      const copy = [...questions];
                      copy[qIdx].options[optIdx].text = e.target.value;
                      setQuestions(copy);
                    }}
                    placeholder={`Option ${optIdx + 1}`}
                    className="flex-1 p-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />

                  {/* Logic Jump Selector */}
                  <select
                    value={opt.nextQuestionId || ''}
                    onChange={(e) => {
                      const copy = [...questions];
                      copy[qIdx].options[optIdx].nextQuestionId = e.target.value || undefined;
                      setQuestions(copy);
                    }}
                    className="p-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <option value="">Next Sequential Question</option>
                    <option value="END_SURVEY">★ Finish / End Survey</option>
                    {questions
                      .filter((_, idx) => idx > qIdx)
                      .map((targetQ, targetIdx) => (
                        <option key={targetQ.tempId} value={targetQ.tempId}>
                          Jump to Question {qIdx + 2 + targetIdx}
                        </option>
                      ))}
                  </select>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addOption(qIdx)}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline mt-1 inline-block"
              >
                + Add Option
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <button type="submit" className="btn-primary">
          Publish Survey →
        </button>
      </div>
    </form>
  );
};
