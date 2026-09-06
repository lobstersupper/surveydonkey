'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Sparkles, Brain, BarChart2, Key, Plus, Trash2, Globe, Users, Lock, Award, ChevronDown, ChevronUp, Eye, Copy } from 'lucide-react';
import { ResultsUnlockConfig, PersonalityArchetype } from '@/db/schema';
import { createSurveyAction } from '@/actions/survey-actions';
import { generateSurveyWithAIAction } from '@/actions/ai-actions';
import { AuthModal } from '@/components/auth/auth-modal';
import { SurveyPreviewModal } from './survey-preview-modal';

interface QuestionDraft {
  tempId: string;
  text: string;
  isDemographicFlag: boolean;
  demographicType?: string;
  options: Array<{
    id: string;
    text: string;
    nextQuestionId?: string;
    archetypeWeights?: Record<string, number>;
  }>;
}

export const SurveyBuilder: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();

  // Core Survey State
  const [surveyType, setSurveyType] = useState<'poll' | 'personality'>('poll');
  const [visibility, setVisibility] = useState<'public' | 'respondents_only' | 'private'>('public');
  const [coinsReward, setCoinsReward] = useState<number>(10);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Results Unlock Config
  const [unlockType, setUnlockType] = useState<'immediate' | 'threshold' | 'scheduled' | 'manual'>('immediate');
  const [thresholdCount, setThresholdCount] = useState<number>(50);
  const [unlockAtDate, setUnlockAtDate] = useState<string>('');

  // AI Copilot State
  const [aiPrompt, setAiPrompt] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Personality Archetypes (for Personality Tests)
  const [archetypes, setArchetypes] = useState<PersonalityArchetype[]>([
    {
      id: 'arch_1',
      title: 'The Visionary Strategist',
      description: 'Big-picture thinker who anticipates industry trends and charts ambitious roadmaps.',
      badgeColor: 'indigo',
      traits: ['Visionary', 'Forward-Thinking', 'Audacious'],
    },
    {
      id: 'arch_2',
      title: 'The High-Velocity Executor',
      description: 'Moves with urgency, eliminates bottlenecks, and delivers tangible results rapidly.',
      badgeColor: 'amber',
      traits: ['Decisive', 'Momentum-Driven', 'Pragmatic'],
    },
    {
      id: 'arch_3',
      title: 'The Craft Artisan',
      description: 'Obsessed with product polish, user empathy, and thoughtful design details.',
      badgeColor: 'emerald',
      traits: ['Design-Centric', 'Quality-Focused', 'Empathetic'],
    },
    {
      id: 'arch_4',
      title: 'The Systems Architect',
      description: 'Engineers repeatable frameworks, robust processes, and scalable unit metrics.',
      badgeColor: 'blue',
      traits: ['Analytical', 'Systematic', 'Structured'],
    },
  ]);

  // Questions List
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      tempId: 'q_demo_1',
      text: 'What is your primary professional focus or industry cohort?',
      isDemographicFlag: true,
      demographicType: 'employment',
      options: [
        { id: 'opt_1_1', text: 'Software Engineering & AI' },
        { id: 'opt_1_2', text: 'Product Management & Design' },
        { id: 'opt_1_3', text: 'Strategy, Finance & Operations' },
        { id: 'opt_1_4', text: 'Marketing & Community' },
      ],
    },
    {
      tempId: 'q_2',
      text: 'How frequently do you leverage AI tools in your workflow?',
      isDemographicFlag: false,
      options: [
        { id: 'opt_2_1', text: 'Daily in core production tasks' },
        { id: 'opt_2_2', text: 'Weekly for specific research or drafting' },
        { id: 'opt_2_3', text: 'Occasionally experimenting' },
        { id: 'opt_2_4', text: 'Never or restricted' },
      ],
    },
  ]);

  // AI Generation Handler
  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      setAiFeedback({ type: 'error', message: 'Please enter a survey topic or description.' });
      return;
    }

    setIsGeneratingAI(true);
    setAiFeedback(null);
    setErrorMsg(null);

    const res = await generateSurveyWithAIAction({
      prompt: aiPrompt,
      surveyType,
      customApiKey: customApiKey.trim() || null,
    });

    setIsGeneratingAI(false);

    if (res.success && res.data) {
      const data = res.data;
      setTitle(data.title || '');
      setDescription(data.description || '');

      if (data.surveyType === 'personality' && data.personalityArchetypes?.length) {
        setArchetypes(data.personalityArchetypes);
      }

      if (data.questions && data.questions.length > 0) {
        const formatted: QuestionDraft[] = data.questions.map((q, qIdx) => ({
          tempId: `q_ai_${Date.now()}_${qIdx}`,
          text: q.text,
          isDemographicFlag: q.isDemographicFlag || false,
          demographicType: q.demographicType || (q.isDemographicFlag ? 'employment' : undefined),
          options: q.options.map((opt, optIdx) => ({
            id: `opt_ai_${qIdx}_${optIdx}`,
            text: opt.text,
            archetypeWeights: opt.archetypeWeights,
          })),
        }));
        setQuestions(formatted);
      }

      setAiFeedback({
        type: 'success',
        message: 'Survey drafted successfully. You can review and adjust questions below before publishing.',
      });
    } else {
      setAiFeedback({
        type: 'error',
        message: res.error || 'Unable to generate survey. Please check your topic and try again.',
      });
    }
  };

  // Archetype Management
  const addArchetype = () => {
    const newId = `arch_${Date.now()}`;
    setArchetypes([
      ...archetypes,
      {
        id: newId,
        title: `Archetype ${archetypes.length + 1}`,
        description: 'Description of this behavioral profile...',
        badgeColor: (['indigo', 'amber', 'emerald', 'blue', 'purple', 'rose'] as const)[
          archetypes.length % 6
        ],
        traits: ['Insightful', 'Focused'],
      },
    ]);
  };

  const removeArchetype = (index: number) => {
    if (archetypes.length <= 2) return;
    setArchetypes(archetypes.filter((_, i) => i !== index));
  };

  // Question Management
  const addQuestion = () => {
    const newId = `q_${Date.now()}`;
    setQuestions([
      ...questions,
      {
        tempId: newId,
        text: '',
        isDemographicFlag: false,
        options: [
          {
            id: `opt_${newId}_1`,
            text: '',
            archetypeWeights: surveyType === 'personality' && archetypes[0] ? { [archetypes[0].id]: 3 } : undefined,
          },
          {
            id: `opt_${newId}_2`,
            text: '',
            archetypeWeights: surveyType === 'personality' && archetypes[1] ? { [archetypes[1].id]: 3 } : undefined,
          },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setQuestions(updated);
  };

  const duplicateQuestion = (index: number) => {
    const q = questions[index];
    const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const clonedQuestion: QuestionDraft = {
      ...q,
      tempId: newId,
      text: `${q.text} (Copy)`,
      options: q.options.map((opt, oIdx) => ({
        ...opt,
        id: `opt_${newId}_${oIdx + 1}`,
        archetypeWeights: opt.archetypeWeights ? { ...opt.archetypeWeights } : undefined,
      })),
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, clonedQuestion);
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    const q = updated[questionIndex];
    const optId = `opt_${q.tempId}_${q.options.length + 1}`;
    q.options.push({
      id: optId,
      text: '',
      archetypeWeights: surveyType === 'personality' && archetypes[0] ? { [archetypes[0].id]: 3 } : undefined,
    });
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options.length <= 2) return;
    updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
  };

  const validateDraft = (): boolean => {
    if (!title.trim()) {
      setErrorMsg('Survey title is required.');
      return false;
    }

    if (questions.some((q) => !q.text.trim())) {
      setErrorMsg('All questions must contain text.');
      return false;
    }

    for (const q of questions) {
      if (q.options.some((opt) => !opt.text.trim())) {
        setErrorMsg('All question answer options must have text.');
        return false;
      }
    }

    if (surveyType === 'personality' && archetypes.some((a) => !a.title.trim())) {
      setErrorMsg('All personality archetypes must have titles.');
      return false;
    }

    return true;
  };

  const executePublish = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    const unlockConfig: ResultsUnlockConfig = {
      type: unlockType,
      thresholdCount: unlockType === 'threshold' ? thresholdCount : undefined,
      unlockAt: unlockType === 'scheduled' ? unlockAtDate : undefined,
      unlocked: unlockType === 'immediate',
    };

    const res = await createSurveyAction({
      title,
      description,
      surveyType,
      visibility,
      personalityArchetypes: surveyType === 'personality' ? archetypes : [],
      coinsReward,
      resultsUnlockConfig: unlockConfig,
      questions,
    });

    setSubmitting(false);

    if (res.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Failed to publish survey.');
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateDraft()) {
      return;
    }

    if (!session?.user?.id) {
      setIsAuthModalOpen(true);
      return;
    }

    await executePublish();
  };

  return (
    <>
      <form onSubmit={handlePublish} className="max-w-3xl mx-auto space-y-8 pb-12">
        {/* Guest Drafting Notice */}
        {!session?.user && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs flex items-center justify-between dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <span className="font-bold">Guest Draft Mode:</span> You can configure surveys freely and will be prompted to sign in or register to publish.
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="btn-secondary text-[11px] py-1 px-2.5 shrink-0 ml-3"
            >
              Sign In / Register
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Top Quick Actions */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            {questions.length} question(s) configured • {surveyType === 'personality' ? `${archetypes.length} archetypes` : 'Consensus poll'}
          </div>
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Eye size={13} />
            Preview Survey Experience
          </button>
        </div>

        {/* Survey Type Selector */}
        <div className="card-high-signal space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Survey Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSurveyType('poll')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                surveyType === 'poll'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-600'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <BarChart2 className={`mt-0.5 ${surveyType === 'poll' ? 'text-blue-600' : 'text-slate-400'}`} size={18} />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Opinion Poll</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Community voting, multiple choice options, and demographic consensus charts.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSurveyType('personality')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                surveyType === 'personality'
                  ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 shadow-sm ring-1 ring-purple-600'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Brain className={`mt-0.5 ${surveyType === 'personality' ? 'text-purple-600' : 'text-slate-400'}`} size={18} />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Personality Test</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Calculates custom archetype profiles for respondents with outcome cards and distribution graphs.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Gemini AI Generator Section */}
        <div className="card-high-signal space-y-4 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Gemini Survey Copilot
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <Key size={12} />
              {showApiKeyInput ? 'Hide API Key' : 'Custom Gemini Key (Optional)'}
              {showApiKeyInput ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {showApiKeyInput && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1 text-xs">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="AIzaSy... (leave blank to use server key)"
                className="w-full p-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500">
                If provided, requests will authenticate using your personal key.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={
                surveyType === 'personality'
                  ? 'e.g. 5-question test: What type of startup founder are you?'
                  : 'e.g. 4-question poll on remote work vs office policies in 2026'
              }
              className="flex-1 p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={isGeneratingAI}
              className="btn-primary text-xs py-2.5 px-4 flex items-center justify-center gap-1.5 shrink-0 bg-indigo-600 hover:bg-indigo-700"
            >
              <Sparkles size={13} />
              {isGeneratingAI ? 'Generating...' : 'Generate with Gemini'}
            </button>
          </div>

          {aiFeedback && (
            <div
              className={`p-2.5 rounded-lg text-xs ${
                aiFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
              }`}
            >
              {aiFeedback.message}
            </div>
          )}
        </div>

        {/* Survey Basic Configuration */}
        <div className="card-high-signal space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            General Details
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Engineering Velocity & Tooling Consensus"
              className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              placeholder="Brief summary explaining the context and objective..."
              className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Visibility and Coin Rewards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Results Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="public">Public (Everyone can view results)</option>
                <option value="respondents_only">Respondents Only (Unlocked after submitting)</option>
                <option value="private">Private (Only creator & admin can view)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Completion Coin Reward
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={coinsReward}
                  onChange={(e) => setCoinsReward(parseInt(e.target.value) || 10)}
                  className="w-full p-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap font-mono">
                  {'{{coins}}'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Personality Archetypes Configuration (Only for Personality Tests) */}
        {surveyType === 'personality' && (
          <div className="card-high-signal space-y-4 border-l-4 border-l-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Personality Archetypes ({archetypes.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Define the outcome profiles that respondents will match with based on their choices.
                </p>
              </div>
              <button
                type="button"
                onClick={addArchetype}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <Plus size={13} /> Add Archetype
              </button>
            </div>

            <div className="space-y-3">
              {archetypes.map((arch, aIdx) => (
                <div
                  key={arch.id}
                  className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 bg-slate-50/50 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={arch.badgeColor || 'blue'}
                        onChange={(e) => {
                          const copy = [...archetypes];
                          copy[aIdx].badgeColor = e.target.value;
                          setArchetypes(copy);
                        }}
                        className="p-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                      >
                        <option value="indigo">Indigo</option>
                        <option value="amber">Amber</option>
                        <option value="emerald">Emerald</option>
                        <option value="blue">Blue</option>
                        <option value="purple">Purple</option>
                        <option value="rose">Rose</option>
                      </select>

                      <input
                        type="text"
                        value={arch.title}
                        onChange={(e) => {
                          const copy = [...archetypes];
                          copy[aIdx].title = e.target.value;
                          setArchetypes(copy);
                        }}
                        placeholder="Archetype Title (e.g. The Visionary)"
                        className="flex-1 p-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    {archetypes.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeArchetype(aIdx)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={arch.description}
                    onChange={(e) => {
                      const copy = [...archetypes];
                      copy[aIdx].description = e.target.value;
                      setArchetypes(copy);
                    }}
                    placeholder="Short description of this archetype's behavior..."
                    className="w-full p-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Unlock Rules */}
        <div className="card-high-signal space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Results Unlock Mechanism
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-3 border rounded-lg text-xs cursor-pointer flex flex-col justify-between ${
                unlockType === 'immediate'
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <input
                  type="radio"
                  name="unlockType"
                  checked={unlockType === 'immediate'}
                  onChange={() => setUnlockType('immediate')}
                />
                Immediate Access
              </div>
              <p className="text-slate-500 mt-1 text-[11px]">Results are unlocked immediately.</p>
            </label>

            <label
              className={`p-3 border rounded-lg text-xs cursor-pointer flex flex-col justify-between ${
                unlockType === 'threshold'
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <input
                  type="radio"
                  name="unlockType"
                  checked={unlockType === 'threshold'}
                  onChange={() => setUnlockType('threshold')}
                />
                Respondent Threshold
              </div>
              <p className="text-slate-500 mt-1 text-[11px]">Lock results until N respondents complete it.</p>
            </label>
          </div>

          {unlockType === 'threshold' && (
            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Target Threshold Count
              </label>
              <input
                type="number"
                min={5}
                max={5000}
                value={thresholdCount}
                onChange={(e) => setThresholdCount(parseInt(e.target.value) || 50)}
                className="w-36 p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>

        {/* Questions Builder */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Questions & Options ({questions.length})
            </h3>
            <button
              type="button"
              onClick={addQuestion}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
            >
              <Plus size={13} /> Add Question
            </button>
          </div>

          {questions.map((q, qIdx) => (
            <div
              key={q.tempId}
              className="card-high-signal space-y-4 border-l-4 border-l-slate-900 dark:border-l-white"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Question {qIdx + 1}
                </span>

                <div className="flex items-center gap-1">
                  {/* Move Up */}
                  <button
                    type="button"
                    onClick={() => moveQuestion(qIdx, 'up')}
                    disabled={qIdx === 0}
                    title="Move Question Up"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                  >
                    <ChevronUp size={14} />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    onClick={() => moveQuestion(qIdx, 'down')}
                    disabled={qIdx === questions.length - 1}
                    title="Move Question Down"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                  >
                    <ChevronDown size={14} />
                  </button>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => duplicateQuestion(qIdx)}
                    title="Duplicate Question"
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded ml-1"
                  >
                    <Copy size={13} />
                  </button>

                  {/* Remove */}
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      title="Remove Question"
                      className="p-1 text-slate-400 hover:text-red-600 rounded ml-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <input
                type="text"
                value={q.text}
                onChange={(e) => {
                  const copy = [...questions];
                  copy[qIdx].text = e.target.value;
                  setQuestions(copy);
                }}
                placeholder="Enter question text..."
                className="w-full p-2.5 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              {/* Demographic Toggle (for polls) */}
              {surveyType === 'poll' && (
                <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
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
                      Demographic Dimension
                    </span>
                  </label>

                  {q.isDemographicFlag && (
                    <select
                      value={q.demographicType || 'custom'}
                      onChange={(e) => {
                        const copy = [...questions];
                        copy[qIdx].demographicType = e.target.value;
                        setQuestions(copy);
                      }}
                      className="p-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="employment">Cohort: Industry / Employment</option>
                      <option value="age">Cohort: Age</option>
                      <option value="gender">Cohort: Gender</option>
                      <option value="country">Cohort: Geography</option>
                      <option value="custom">Cohort: Custom</option>
                    </select>
                  )}
                </div>
              )}

              {/* Options List */}
              <div className="space-y-2 pt-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {surveyType === 'personality'
                    ? 'Answer Options & Personality Archetype Linkages'
                    : 'Answer Options & Logic Jumps'}
                </label>

                {q.options.map((opt, optIdx) => (
                  <div key={opt.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
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
                        className="flex-1 p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    {/* For Personality Test: Archetype Weight Mapping */}
                    {surveyType === 'personality' && archetypes.length > 0 && (
                      <div className="flex items-center gap-1.5 pl-6 sm:pl-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Maps to:</span>
                        <select
                          value={Object.keys(opt.archetypeWeights || {})[0] || archetypes[0]?.id || ''}
                          onChange={(e) => {
                            const copy = [...questions];
                            copy[qIdx].options[optIdx].archetypeWeights = {
                              [e.target.value]: 3,
                            };
                            setQuestions(copy);
                          }}
                          className="p-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-purple-50/50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-medium"
                        >
                          {archetypes.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* For Polls: Logic Jump Selector */}
                    {surveyType === 'poll' && (
                      <select
                        value={opt.nextQuestionId || ''}
                        onChange={(e) => {
                          const copy = [...questions];
                          copy[qIdx].options[optIdx].nextQuestionId = e.target.value || undefined;
                          setQuestions(copy);
                        }}
                        className="p-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <option value="">Next Sequential Question</option>
                        <option value="END_SURVEY">★ Finish / End Survey</option>
                        {questions
                          .filter((_, idx) => idx > qIdx)
                          .map((targetQ, targetIdx) => (
                            <option key={targetQ.tempId} value={targetQ.tempId}>
                              Jump to Q{qIdx + 2 + targetIdx}
                            </option>
                          ))}
                      </select>
                    )}

                    {q.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(qIdx, optIdx)}
                        className="text-slate-400 hover:text-red-500 p-1 self-center"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addOption(qIdx)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline mt-1 inline-block"
                >
                  + Add Option
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Publish & Preview Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-1.5"
          >
            <Eye size={14} />
            Preview Survey Experience
          </button>

          <button type="submit" disabled={submitting} className="btn-primary text-xs py-3 px-6 shadow">
            {submitting
              ? 'Publishing...'
              : session?.user
              ? `Publish ${surveyType === 'personality' ? 'Personality Test' : 'Survey'} →`
              : `Create Account & Publish →`}
          </button>
        </div>
      </form>

      {/* Interactive Survey Preview Modal */}
      <SurveyPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        surveyType={surveyType}
        title={title || 'Untitled Survey'}
        description={description}
        coinsReward={coinsReward}
        archetypes={archetypes}
        questions={questions}
      />

      {/* Auth Modal for guest publishers */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={async () => {
          setIsAuthModalOpen(false);
          await executePublish();
        }}
        title="Create an Account to Publish"
        subtitle="Create an account or sign in to activate and publish your survey."
        initialMode="signup"
      />
    </>
  );
};
