'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Flame, Sparkles, Brain, BarChart2, Share2, Award, Users, CheckCircle2, Lock, X } from 'lucide-react';
import { Survey } from '@/db/schema';
import { ShareModal } from './share-modal';

interface SurveyItem extends Survey {
  responsesCount: number;
  questionsCount: number;
  unlockStatus: {
    isUnlocked: boolean;
    progressPercent: number;
    requiredResponses?: number;
    currentResponses: number;
  };
  score?: number;
  isHot?: boolean;
}

interface HotSurveysFeedProps {
  initialSurveys: SurveyItem[];
}

export const HotSurveysFeed: React.FC<HotSurveysFeedProps> = ({ initialSurveys }) => {
  const [activeTab, setActiveTab] = useState<'hot' | 'newest' | 'personality' | 'poll'>('hot');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShareSurvey, setSelectedShareSurvey] = useState<SurveyItem | null>(null);

  const filteredSurveys = useMemo(() => {
    let list = [...initialSurveys];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }

    // Tab filter & sort
    if (activeTab === 'personality') {
      list = list.filter((s) => s.surveyType === 'personality');
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (activeTab === 'poll') {
      list = list.filter((s) => s.surveyType === 'poll');
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (activeTab === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // 'hot'
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    return list;
  }, [initialSurveys, activeTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Controls: Search Bar & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('hot')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'hot'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Flame size={14} className="text-amber-500" />
            Hot
          </button>
          <button
            onClick={() => setActiveTab('newest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'newest'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles size={14} className="text-blue-500" />
            Newest
          </button>
          <button
            onClick={() => setActiveTab('personality')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'personality'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Brain size={14} className="text-purple-500" />
            Personality Tests
          </button>
          <button
            onClick={() => setActiveTab('poll')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'poll'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart2 size={14} className="text-emerald-500" />
            Opinion Polls
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search surveys or tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Surveys Grid */}
      {filteredSurveys.length === 0 ? (
        <div className="card-high-signal text-center py-16">
          <p className="text-sm text-slate-500">No matching surveys found.</p>
          <Link href="/dashboard/new" className="btn-primary text-xs mt-4 inline-block">
            Create a Survey or Test →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSurveys.map((survey) => {
            const isPersonality = survey.surveyType === 'personality';
            const coinsReward = survey.coinsReward || 10;

            return (
              <div
                key={survey.id}
                className="card-high-signal flex flex-col justify-between space-y-6 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="space-y-3">
                  {/* Top Metadata Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          isPersonality
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {isPersonality ? <Brain size={11} /> : <BarChart2 size={11} />}
                        {isPersonality ? 'Personality Test' : 'Opinion Poll'}
                      </span>

                      <span className="text-[11px] font-mono text-slate-400">
                        {survey.questionsCount} Questions
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Coins Reward Chip */}
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        <Award size={11} className="text-amber-500" />
                        +{coinsReward} {'{{coins}}'}
                      </span>

                      {/* Unlock Status */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          survey.unlockStatus.isUnlocked
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {survey.unlockStatus.isUnlocked ? (
                          <CheckCircle2 size={10} />
                        ) : (
                          <Lock size={10} />
                        )}
                        {survey.unlockStatus.isUnlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>
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

                {/* Progress & Actions */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {survey.responsesCount} Total Respondents
                    </span>
                    <span>{survey.unlockStatus.progressPercent}% Goal</span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        survey.unlockStatus.isUnlocked
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : 'bg-blue-600 dark:bg-blue-500'
                      }`}
                      style={{ width: `${Math.max(5, survey.unlockStatus.progressPercent)}%` }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Link
                      href={`/surveys/${survey.id}`}
                      className="btn-primary text-xs flex-1 text-center py-2"
                    >
                      {isPersonality ? 'Take Test →' : 'Take Survey →'}
                    </Link>

                    <Link
                      href={`/surveys/${survey.id}/results`}
                      className="btn-secondary text-xs text-center py-2 px-3"
                    >
                      {survey.unlockStatus.isUnlocked ? 'Results' : 'Status'}
                    </Link>

                    <button
                      onClick={() => setSelectedShareSurvey(survey)}
                      title="Share link & QR"
                      className="btn-secondary text-xs p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal Dialog */}
      {selectedShareSurvey && (
        <ShareModal
          surveyId={selectedShareSurvey.id}
          surveyTitle={selectedShareSurvey.title}
          surveyType={selectedShareSurvey.surveyType}
          isOpen={true}
          onClose={() => setSelectedShareSurvey(null)}
        />
      )}
    </div>
  );
};
