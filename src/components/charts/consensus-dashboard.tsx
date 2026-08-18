'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Question, QuestionOption, Response } from '@/db/schema';

interface ConsensusDashboardProps {
  questions: Question[];
  responses: Response[];
  userAnswers?: Record<string, string>;
}

export const ConsensusDashboard: React.FC<ConsensusDashboardProps> = ({
  questions,
  responses,
  userAnswers = {},
}) => {
  const [activeDemographicFilter, setActiveDemographicFilter] = useState<string>('ALL');

  // Filter out demographic setup questions for opinion breakdown
  const opinionQuestions = questions.filter((q) => !q.isDemographicFlag);

  // Compute breakdown per question option
  const getQuestionMetrics = (question: Question) => {
    const options = (question.options || []) as QuestionOption[];
    
    // Filter responses by active cohort filter if selected
    let filteredResponses = responses;
    if (activeDemographicFilter !== 'ALL') {
      const demoQuestion = questions.find((q) => q.isDemographicFlag);
      if (demoQuestion) {
        filteredResponses = responses.filter(
          (r) => r.answers[demoQuestion.id] === activeDemographicFilter
        );
      }
    }

    const totalCount = filteredResponses.length || 1;

    const data = options.map((opt) => {
      const count = filteredResponses.filter((r) => r.answers[question.id] === opt.id).length;
      const percentage = Math.round((count / totalCount) * 100);
      const isUserChoice = userAnswers[question.id] === opt.id;

      return {
        id: opt.id,
        name: opt.text,
        count,
        percentage,
        isUserChoice,
      };
    });

    return { data, totalCount };
  };

  // Get demographic question options for filtering
  const demoQuestion = questions.find((q) => q.isDemographicFlag);
  const demoOptions = (demoQuestion?.options || []) as QuestionOption[];

  return (
    <div className="space-y-8">
      {/* Demographic Cohort Selector Bar */}
      {demoQuestion && demoOptions.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-md flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Filter by Cohort:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveDemographicFilter('ALL')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                activeDemographicFilter === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              All Respondents ({responses.length})
            </button>
            {demoOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveDemographicFilter(opt.id)}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  activeDemographicFilter === opt.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Questions Breakdown */}
      {opinionQuestions.map((q, index) => {
        const { data, totalCount } = getQuestionMetrics(q);
        const userChoice = data.find((d) => d.isUserChoice);

        return (
          <div
            key={q.id}
            className="card-high-signal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6"
          >
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Question {index + 1}
                </span>
                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {q.text}
                </h4>
              </div>
              {userChoice && (
                <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1.5 rounded text-xs">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                    Your Choice: {userChoice.name}
                  </span>
                </div>
              )}
            </div>

            {/* Recharts Bar Chart */}
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" domain={[0, 100]} unit="%" stroke="#94A3B8" fontSize={11} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={180}
                    stroke="#64748B"
                    fontSize={11}
                    tickFormatter={(value) => (value.length > 28 ? `${value.substring(0, 26)}...` : value)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded text-xs shadow-lg">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-slate-300 mt-1">
                              {item.percentage}% ({item.count} votes out of {totalCount})
                            </p>
                            {item.isUserChoice && (
                              <p className="text-indigo-400 font-bold mt-1">★ Your Selected Answer</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                    {data.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.isUserChoice ? '#4F46E5' : '#0F172A'}
                        opacity={entry.isUserChoice ? 1.0 : 0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Option Details List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {data.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-3 rounded border text-xs flex items-center justify-between transition-all ${
                    opt.isUserChoice
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {opt.isUserChoice && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    )}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {opt.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {opt.percentage}% <span className="text-slate-400 font-normal">({opt.count})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
