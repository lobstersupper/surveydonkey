'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PersonalityArchetype } from '@/db/schema';

interface ArchetypeMetric {
  archetypeId: string;
  title: string;
  description: string;
  badgeColor: string;
  count: number;
  percentage: number;
}

interface PersonalityDistributionChartProps {
  archetypes: PersonalityArchetype[];
  distribution: ArchetypeMetric[];
  userArchetypeId?: string | null;
}

const COLOR_MAP: Record<string, string> = {
  indigo: '#4f46e5',
  amber: '#d97706',
  emerald: '#059669',
  blue: '#2563eb',
  purple: '#9333ea',
  rose: '#e11d48',
};

export const PersonalityDistributionChart: React.FC<PersonalityDistributionChartProps> = ({
  archetypes,
  distribution,
  userArchetypeId,
}) => {
  const chartData = distribution.map((item) => ({
    name: item.title,
    archetypeId: item.archetypeId,
    percentage: item.percentage,
    count: item.count,
    color: COLOR_MAP[item.badgeColor] || '#2563eb',
    isUserArchetype: userArchetypeId === item.archetypeId,
  }));

  return (
    <div className="space-y-6">
      {/* Distribution Bar Chart */}
      <div className="card-high-signal p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Archetype Distribution Across All Respondents
          </h3>
          {userArchetypeId && (
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded">
              ★ Indicates Your Result
            </span>
          )}
        </div>

        <div
          className="w-full"
          style={{ height: `${Math.max(260, chartData.length * 60)}px` }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                dataKey="name"
                type="category"
                width={150}
                tick={{ fontSize: 12, fontWeight: 500, fill: '#334155' }}
              />
              <Tooltip
                formatter={(val: any, name: any, item: any) => [
                  `${val}% (${item.payload.count} respondents)`,
                  'Share',
                ]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="percentage" radius={[0, 6, 6, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.archetypeId}`}
                    fill={entry.color}
                    stroke={entry.isUserArchetype ? '#ffffff' : 'transparent'}
                    strokeWidth={entry.isUserArchetype ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Archetypes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {distribution.map((item) => {
          const isUserMatch = userArchetypeId === item.archetypeId;
          const hexColor = COLOR_MAP[item.badgeColor] || '#2563eb';
          const archDef = archetypes.find((a) => a.id === item.archetypeId);

          return (
            <div
              key={item.archetypeId}
              className={`p-5 rounded-xl border transition-all ${
                isUserMatch
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-md ring-1 ring-blue-500'
                  : 'card-high-signal'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: hexColor }}
                    />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h4>
                    {isUserMatch && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-1.5 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                    {item.percentage}%
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono">{item.count} votes</p>
                </div>
              </div>

              {archDef?.traits && archDef.traits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {archDef.traits.map((trait) => (
                    <span
                      key={trait}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
