'use client';

import React, { useState, useMemo } from 'react';
import {
  Share2,
  Filter,
  Globe,
  Smartphone,
  ShieldCheck,
  Download,
  Copy,
  Check,
  BarChart3,
  Table,
  PieChart,
  Info,
  X,
  TrendingUp,
} from 'lucide-react';
import { Survey, Question, Response, PersonalityArchetype } from '@/db/schema';
import { ConsensusDashboard } from './consensus-dashboard';
import { D3DemographicCluster } from './d3-demographic-cluster';
import { PersonalityDistributionChart } from './personality-distribution-chart';
import { CrossTabMatrix } from './cross-tab-matrix';
import { ResponseTimelineChart } from './response-timeline-chart';
import { ShareModal } from '../survey/share-modal';

interface CrossSurveyStats {
  totalRespondents: number;
  returningRespondentsPercent: number;
  powerRespondentsPercent: number;
}

interface ResultsViewProps {
  survey: Survey;
  questions: Question[];
  responses: Response[];
  crossSurveyStats: CrossSurveyStats;
  userResponse?: Response | null;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  survey,
  questions,
  responses,
  crossSurveyStats,
  userResponse,
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'crosstab' | 'clusters' | 'timeline'>('overview');

  // Organic filters
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedDevice, setSelectedDevice] = useState<string>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<string>('ALL');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isOrganicInspectorOpen, setIsOrganicInspectorOpen] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Available countries from responses
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    responses.forEach((r) => {
      if (r.country) set.add(r.country);
    });
    return Array.from(set).sort();
  }, [responses]);

  // Filter responses by organic criteria
  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      if (selectedCountry !== 'ALL' && r.country !== selectedCountry) {
        return false;
      }
      if (selectedDevice !== 'ALL' && r.deviceType !== selectedDevice) {
        return false;
      }
      if (selectedActivity !== 'ALL') {
        const cohort = r.organicCohort as any;
        if (selectedActivity === 'power' && cohort?.activityTier !== 'power_respondent') {
          return false;
        }
        if (selectedActivity === 'returning' && !cohort?.isReturning) {
          return false;
        }
        if (selectedActivity === 'newcomer' && cohort?.activityTier !== 'newcomer') {
          return false;
        }
      }
      return true;
    });
  }, [responses, selectedCountry, selectedDevice, selectedActivity]);

  // Personality Distribution Data
  const personalityDistribution = useMemo(() => {
    if (survey.surveyType !== 'personality' || !survey.personalityArchetypes) return [];

    const total = filteredResponses.length;
    const counts: Record<string, number> = {};
    survey.personalityArchetypes.forEach((a) => {
      counts[a.id] = 0;
    });

    filteredResponses.forEach((r) => {
      if (r.resultArchetypeId && counts[r.resultArchetypeId] !== undefined) {
        counts[r.resultArchetypeId]++;
      }
    });

    return survey.personalityArchetypes.map((a) => {
      const count = counts[a.id] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        archetypeId: a.id,
        title: a.title,
        description: a.description,
        badgeColor: a.badgeColor || 'blue',
        count,
        percentage,
      };
    });
  }, [survey, filteredResponses]);

  const userArchetypeId = userResponse?.resultArchetypeId || null;

  // Organic Intelligence Breakdown Stats
  const organicBreakdown = useMemo(() => {
    const total = responses.length || 1;
    const deviceCounts: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    const countryCounts: Record<string, number> = {};
    const activityCounts: Record<string, number> = { newcomer: 0, engaged: 0, power_respondent: 0 };

    responses.forEach((r) => {
      if (r.deviceType && deviceCounts[r.deviceType] !== undefined) {
        deviceCounts[r.deviceType]++;
      }
      const c = r.country || 'Unknown';
      countryCounts[c] = (countryCounts[c] || 0) + 1;

      const cohort = r.organicCohort as any;
      const tier = cohort?.activityTier || 'newcomer';
      if (activityCounts[tier] !== undefined) {
        activityCounts[tier]++;
      } else {
        activityCounts.newcomer++;
      }
    });

    return {
      devices: deviceCounts,
      countries: Object.entries(countryCounts).sort((a, b) => b[1] - a[1]),
      activities: activityCounts,
      totalResponses: responses.length,
    };
  }, [responses]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredResponses.length === 0) return;

    // Header row
    const qHeaders = questions.map((q) => `"${q.text.replace(/"/g, '""')}"`);
    const headers = [
      'Response ID',
      'Submitted At',
      'Country',
      'Device Platform',
      'Participation Tier',
      'Personality Archetype',
      ...qHeaders,
    ];

    const rows = filteredResponses.map((r) => {
      const cohort = r.organicCohort as any;
      const qAnswers = questions.map((q) => {
        const ans = r.answers[q.id];
        if (!ans) return '""';
        const opt = q.options?.find((o) => o.id === ans);
        const text = opt ? opt.text : ans;
        return `"${text.replace(/"/g, '""')}"`;
      });

      return [
        `"${r.id}"`,
        `"${new Date(r.submittedAt).toISOString()}"`,
        `"${r.country || 'Unknown'}"`,
        `"${r.deviceType || 'unknown'}"`,
        `"${cohort?.activityTier || 'newcomer'}"`,
        `"${r.resultArchetypeId || 'N/A'}"`,
        ...qAnswers,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `survey-${survey.id}-responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy Markdown Summary Handler
  const handleCopyMarkdownSummary = async () => {
    let md = `# Survey Consensus Summary: ${survey.title}\n\n`;
    md += `- **Type**: ${survey.surveyType === 'personality' ? 'Personality Test' : 'Opinion Poll'}\n`;
    md += `- **Total Sample Size**: ${filteredResponses.length} verified responses\n`;
    md += `- **Generated On**: ${new Date().toLocaleDateString()}\n\n`;

    if (survey.surveyType === 'personality' && personalityDistribution.length > 0) {
      md += `## Archetype Distribution\n\n`;
      md += `| Archetype | Count | Share |\n`;
      md += `| :--- | :--- | :--- |\n`;
      personalityDistribution.forEach((a) => {
        md += `| **${a.title}** | ${a.count} | ${a.percentage}% |\n`;
      });
      md += `\n`;
    }

    md += `## Question Consensus Breakdown\n\n`;
    questions.forEach((q, idx) => {
      md += `### ${idx + 1}. ${q.text}\n\n`;
      md += `| Option | Votes | Share |\n`;
      md += `| :--- | :--- | :--- |\n`;

      const counts: Record<string, number> = {};
      q.options?.forEach((o) => {
        counts[o.id] = 0;
      });
      filteredResponses.forEach((r) => {
        const ans = r.answers[q.id];
        if (ans && counts[ans] !== undefined) {
          counts[ans]++;
        }
      });

      const totalQ = filteredResponses.length || 1;
      q.options?.forEach((o) => {
        const c = counts[o.id] || 0;
        const pct = Math.round((c / totalQ) * 100);
        md += `| ${o.text} | ${c} | ${pct}% |\n`;
      });
      md += `\n`;
    });

    try {
      await navigator.clipboard.writeText(md);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2500);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner: Cross-Survey Identity Intelligence & Actions */}
      <div className="card-high-signal p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Organic Classification & Cross-Survey Reference
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
            <span>{responses.length} Total Verified Responses</span>
            <span>•</span>
            <span>{crossSurveyStats.returningRespondentsPercent}% Cross-Survey Respondents</span>
            <span>•</span>
            <span>{crossSurveyStats.powerRespondentsPercent}% Power Contributors</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsOrganicInspectorOpen(true)}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Inspect Organic Fingerprints"
          >
            <Info size={13} />
            Organic Audit
          </button>

          <button
            onClick={handleCopyMarkdownSummary}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Copy Results as Markdown"
          >
            {copiedMarkdown ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copiedMarkdown ? 'Copied' : 'Copy Summary'}
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Export CSV Dataset"
          >
            <Download size={13} />
            Export CSV
          </button>

          <button
            onClick={() => setIsShareOpen(true)}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shrink-0"
          >
            <Share2 size={13} />
            Share Results
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 size={14} />
          Primary Overview
        </button>

        {questions.length >= 2 && (
          <button
            onClick={() => setActiveTab('crosstab')}
            className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'crosstab'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Table size={14} />
            Cross-Tab Matrix
          </button>
        )}

        <button
          onClick={() => setActiveTab('clusters')}
          className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'clusters'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <PieChart size={14} />
          Demographic Clusters
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'timeline'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp size={14} />
          Voting Momentum
        </button>
      </div>

      {/* Organic Cohort Filter Toolbar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Filter size={13} />
            Organic Cohort Slicing
          </div>
          <span className="text-xs font-mono text-slate-500">
            Showing {filteredResponses.length} of {responses.length} responses
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Country Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Location / Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Countries</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Device Type Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Device Platform
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </select>
          </div>

          {/* Activity Tier Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Participation Tier
            </label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="w-full p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Cohorts</option>
              <option value="power">Power Respondents (5+ surveys)</option>
              <option value="returning">Returning Respondents</option>
              <option value="newcomer">First-Time Voters</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {survey.surveyType === 'personality' && survey.personalityArchetypes?.length ? (
            <div className="space-y-8">
              <PersonalityDistributionChart
                archetypes={survey.personalityArchetypes}
                distribution={personalityDistribution}
                userArchetypeId={userArchetypeId}
              />

              <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Individual Question Answers Breakdown
                </h3>
                <ConsensusDashboard
                  questions={questions}
                  responses={filteredResponses}
                  userAnswers={userResponse?.answers}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Question Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Consensus Breakdown
                </h3>
                <ConsensusDashboard
                  questions={questions}
                  responses={filteredResponses}
                  userAnswers={userResponse?.answers}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: CROSS-TAB MATRIX */}
      {activeTab === 'crosstab' && questions.length >= 2 && (
        <div className="space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Cross-Tabulation & Contingency Analysis
            </h3>
            <p className="text-xs text-slate-500">
              Compare respondent selections between any two questions to discover correlations and behavioral patterns.
            </p>
          </div>
          <CrossTabMatrix questions={questions} responses={filteredResponses} />
        </div>
      )}

      {/* TAB 3: DEMOGRAPHIC & CLUSTERING */}
      {activeTab === 'clusters' && (
        <div className="space-y-8">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Demographic Clustering Visualization
            </h3>
            <p className="text-xs text-slate-500">
              Interactive geographic and platform clustering showing how different segments voted.
            </p>
          </div>
          <D3DemographicCluster
            questions={questions}
            responses={filteredResponses}
            userResponseId={userResponse?.id}
          />
        </div>
      )}

      {/* TAB 4: VOTING MOMENTUM & VELOCITY */}
      {activeTab === 'timeline' && (
        <ResponseTimelineChart
          responses={filteredResponses}
          createdAt={survey.createdAt}
        />
      )}

      {/* Organic Intelligence Inspector Modal */}
      {isOrganicInspectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card-high-signal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOrganicInspectorOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={20} />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Organic Intelligence Audit
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Composite fingerprint telemetry & cross-survey network analysis
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Sample
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {organicBreakdown.totalResponses}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Cross-Survey
                </span>
                <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {crossSurveyStats.returningRespondentsPercent}%
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Power Tier
                </span>
                <span className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                  {crossSurveyStats.powerRespondentsPercent}%
                </span>
              </div>
            </div>

            {/* Platform & Activity Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                  Device Breakdown
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">Desktop</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {organicBreakdown.devices.desktop} (
                      {Math.round((organicBreakdown.devices.desktop / organicBreakdown.totalResponses) * 100)}%)
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">Mobile</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {organicBreakdown.devices.mobile} (
                      {Math.round((organicBreakdown.devices.mobile / organicBreakdown.totalResponses) * 100)}%)
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">Tablet</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {organicBreakdown.devices.tablet} (
                      {Math.round((organicBreakdown.devices.tablet / organicBreakdown.totalResponses) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                  Top Detected Locations
                </span>
                <div className="space-y-1.5 text-xs">
                  {organicBreakdown.countries.slice(0, 4).map(([country, count]) => (
                    <div key={country} className="flex justify-between font-mono">
                      <span className="text-slate-500">{country}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {count} ({Math.round((count / organicBreakdown.totalResponses) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Privacy Architecture Notice */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
              <span className="font-bold block">Privacy-First Architecture:</span>
              <p>
                Zero personally identifiable information is stored. Respondent identity clusters are synthesized using salt-hashed subnet routing, canvas rendering hashes, and anonymous session keys.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsOrganicInspectorOpen(false)}
                className="btn-primary text-xs py-2 px-4"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal Dialog */}
      <ShareModal
        surveyId={survey.id}
        surveyTitle={survey.title}
        surveyType={survey.surveyType}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
};

