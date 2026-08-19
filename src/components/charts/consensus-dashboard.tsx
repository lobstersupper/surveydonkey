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

// Country code to friendly name & flag mapping
const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
  US: { name: 'United States', flag: '🇺🇸' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  SG: { name: 'Singapore', flag: '🇸🇬' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  FR: { name: 'France', flag: '🇫🇷' },
  IN: { name: 'India', flag: '🇮🇳' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  BR: { name: 'Brazil', flag: '🇧🇷' },
};

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

  // Compute geographic & environment insights
  const totalResponsesCount = responses.length || 1;

  // 1. Country breakdown
  const countryCounts: Record<string, number> = {};
  responses.forEach((r) => {
    const code = (r.country || 'US').toUpperCase();
    countryCounts[code] = (countryCounts[code] || 0) + 1;
  });
  const countryBreakdown = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => {
      const info = COUNTRY_MAP[code] || { name: code, flag: '🌐' };
      return {
        code,
        name: info.name,
        flag: info.flag,
        count,
        percentage: Math.round((count / totalResponsesCount) * 100),
      };
    });

  // 2. Device Breakdown
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  responses.forEach((r) => {
    const dev = (r.deviceType || 'desktop').toLowerCase();
    if (dev.includes('mobile')) deviceCounts.mobile += 1;
    else if (dev.includes('tablet')) deviceCounts.tablet += 1;
    else deviceCounts.desktop += 1;
  });

  // 3. Timezone breakdown
  const timezoneCounts: Record<string, number> = {};
  responses.forEach((r) => {
    const tz = r.timezone || 'UTC';
    timezoneCounts[tz] = (timezoneCounts[tz] || 0) + 1;
  });
  const topTimezones = Object.entries(timezoneCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tz, count]) => ({
      timezone: tz.replace('_', ' '),
      count,
      percentage: Math.round((count / totalResponsesCount) * 100),
    }));

  // Get demographic question options for filtering
  const demoQuestion = questions.find((q) => q.isDemographicFlag);
  const demoOptions = (demoQuestion?.options || []) as QuestionOption[];

  return (
    <div className="space-y-8">
      {/* Demographic Cohort Selector Bar */}
      {demoQuestion && demoOptions.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Filter by Cohort:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveDemographicFilter('ALL')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeDemographicFilter === 'ALL'
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white font-bold'
                  : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              All Respondents ({responses.length})
            </button>
            {demoOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveDemographicFilter(opt.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeDemographicFilter === opt.id
                    ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white font-bold'
                    : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zero-Friction Geographic & Device Consensus Intelligence */}
      <div className="card-high-signal space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge-minimal">Zero-Friction Telemetry</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                100% Privacy Compliant Coarse Geolocation
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              Geographic & Environment Distribution
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {responses.length} Verified Submissions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Country Distribution */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Top Respondent Regions
            </h4>
            <div className="space-y-2">
              {countryBreakdown.map((c) => (
                <div key={c.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {c.percentage}% <span className="text-slate-400 font-normal">({c.count})</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${c.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Device Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Device Form Factors
            </h4>
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">💻</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Desktop</div>
                    <div className="text-[10px] text-slate-500">Workstation & Laptops</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {Math.round((deviceCounts.desktop / totalResponsesCount) * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-400">{deviceCounts.desktop} votes</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">📱</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Mobile</div>
                    <div className="text-[10px] text-slate-500">iOS & Android Handhelds</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {Math.round((deviceCounts.mobile / totalResponsesCount) * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-400">{deviceCounts.mobile} votes</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">📟</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Tablet</div>
                    <div className="text-[10px] text-slate-500">iPad & Tablets</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {Math.round((deviceCounts.tablet / totalResponsesCount) * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-400">{deviceCounts.tablet} votes</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Top Timezones */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Timezones
            </h4>
            <div className="space-y-2">
              {topTimezones.map((tz) => (
                <div
                  key={tz.timezone}
                  className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2 font-mono text-[11px]">
                    🌐 {tz.timezone}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {tz.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Consensus Breakdown by Question */}
      {opinionQuestions.map((q) => {
        const { data, totalCount } = getQuestionMetrics(q);

        return (
          <div key={q.id} className="card-high-signal space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {q.text}
              </h3>
              <span className="badge-minimal">
                {totalCount} {totalCount === 1 ? 'Response' : 'Responses'}
              </span>
            </div>

            {/* Recharts Horizontal Bar Chart */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-slate-300 mt-1">
                              {item.percentage}% ({item.count} votes out of {totalCount})
                            </p>
                            {item.isUserChoice && (
                              <p className="text-blue-400 font-bold mt-1">★ Your Selected Answer</p>
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
                        fill={entry.isUserChoice ? '#2563EB' : '#3B82F6'}
                        opacity={entry.isUserChoice ? 1.0 : 0.85}
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
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                    opt.isUserChoice
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {opt.isUserChoice && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
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
