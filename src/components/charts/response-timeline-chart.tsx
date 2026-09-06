'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Response } from '@/db/schema';
import { TrendingUp, BarChart2, Calendar, Zap, Smartphone, Monitor } from 'lucide-react';

interface ResponseTimelineChartProps {
  responses: Response[];
  createdAt: Date | string;
}

export const ResponseTimelineChart: React.FC<ResponseTimelineChartProps> = ({
  responses,
  createdAt,
}) => {
  const [metricMode, setMetricMode] = useState<'cumulative' | 'daily'>('cumulative');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'desktop' | 'mobile'>('all');

  // Filter responses by hardware class if selected
  const filteredResponses = useMemo(() => {
    if (deviceFilter === 'all') return responses;
    return responses.filter((r) => {
      const dev = (r.deviceType || '').toLowerCase();
      if (deviceFilter === 'mobile') return dev.includes('mobile') || dev.includes('phone');
      if (deviceFilter === 'desktop') return !dev.includes('mobile') && !dev.includes('phone') && !dev.includes('tablet');
      return true;
    });
  }, [responses, deviceFilter]);

  // Aggregate responses by day
  const timelineData = useMemo(() => {
    if (filteredResponses.length === 0) return [];

    // Sort responses by submittedAt ascending
    const sorted = [...filteredResponses].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );

    const bucketMap: Record<string, { date: string; rawDate: Date; count: number; desktop: number; mobile: number }> = {};

    sorted.forEach((resp) => {
      const d = new Date(resp.submittedAt);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      if (!bucketMap[dateKey]) {
        bucketMap[dateKey] = {
          date: label,
          rawDate: d,
          count: 0,
          desktop: 0,
          mobile: 0,
        };
      }

      bucketMap[dateKey].count++;
      const dev = (resp.deviceType || '').toLowerCase();
      if (dev.includes('mobile') || dev.includes('phone')) {
        bucketMap[dateKey].mobile++;
      } else {
        bucketMap[dateKey].desktop++;
      }
    });

    const keys = Object.keys(bucketMap).sort();
    let cumulative = 0;

    return keys.map((key) => {
      const item = bucketMap[key];
      cumulative += item.count;
      return {
        date: item.date,
        count: item.count,
        cumulative,
        desktop: item.desktop,
        mobile: item.mobile,
      };
    });
  }, [filteredResponses]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const total = filteredResponses.length;
    if (timelineData.length === 0) {
      return { total: 0, peakDay: 0, peakDate: 'N/A', avgPerDay: 0 };
    }

    let peakDay = 0;
    let peakDate = timelineData[0]?.date || 'N/A';

    timelineData.forEach((item) => {
      if (item.count > peakDay) {
        peakDay = item.count;
        peakDate = item.date;
      }
    });

    const activeDays = Math.max(1, timelineData.length);
    const avgPerDay = Math.round((total / activeDays) * 10) / 10;

    return { total, peakDay, peakDate, avgPerDay };
  }, [filteredResponses, timelineData]);

  if (responses.length === 0) {
    return (
      <div className="card-high-signal p-8 text-center text-slate-500 rounded-xl">
        <p className="text-xs">No response telemetry recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="card-high-signal p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Response Velocity & Growth Momentum
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <Zap size={10} />
              Real-time Influx
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Temporal distribution and voting trajectory across verified submissions.
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Pill */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setMetricMode('cumulative')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                metricMode === 'cumulative'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp size={12} />
              Cumulative
            </button>
            <button
              onClick={() => setMetricMode('daily')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                metricMode === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BarChart2 size={12} />
              Daily Influx
            </button>
          </div>

          {/* Device Pill */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setDeviceFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                deviceFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDeviceFilter('desktop')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                deviceFilter === 'desktop'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Desktop Only"
            >
              <Monitor size={11} />
            </button>
            <button
              onClick={() => setDeviceFilter('mobile')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                deviceFilter === 'mobile'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Mobile Only"
            >
              <Smartphone size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Sample Volume
          </span>
          <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100 mt-0.5 block">
            {metrics.total}
          </span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Daily Run Rate
          </span>
          <span className="text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-0.5 block">
            ~{metrics.avgPerDay} / day
          </span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Peak Velocity
          </span>
          <span className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {metrics.peakDay} responses
          </span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Peak Influx Date
          </span>
          <span className="text-lg font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-0.5 block">
            {metrics.peakDate}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {metricMode === 'cumulative' ? (
            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
              <XAxis
                dataKey="date"
                stroke="currentColor"
                className="text-slate-400 font-mono text-[11px]"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="currentColor"
                className="text-slate-400 font-mono text-[11px]"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#F8FAFC',
                }}
                formatter={(value: any) => [`${value} cumulative votes`, 'Total Volume']}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#3B82F6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#velocityGradient)"
              />
            </AreaChart>
          ) : (
            <BarChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
              <XAxis
                dataKey="date"
                stroke="currentColor"
                className="text-slate-400 font-mono text-[11px]"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="currentColor"
                className="text-slate-400 font-mono text-[11px]"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#F8FAFC',
                }}
                formatter={(value: any) => [`${value} responses`, 'Daily Influx']}
              />
              <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={45} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
