'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Question, Response } from '@/db/schema';
import { Globe, Smartphone, ShieldCheck, Layers, Info, CheckCircle2 } from 'lucide-react';

interface D3DemographicClusterProps {
  questions: Question[];
  responses: Response[];
  userResponseId?: string | null;
}

type ClusterMode = 'geo' | 'device' | 'activity';

interface DemographicNode extends d3.SimulationNodeDatum {
  id: string;
  ageGroup: string;
  geoRegion: string;
  country: string;
  deviceClass: string;
  activityTier: string;
  ipHashShort: string;
  isUser: boolean;
  answers: Record<string, string>;
  radius: number;
}

function deriveGeoRegion(resp: Response, geoQuestion?: Question, getOptionLabel?: (qId: string, optId: string) => string): string {
  if (geoQuestion && getOptionLabel) {
    const geoOptId = resp.answers[geoQuestion.id];
    if (geoOptId) {
      const label = getOptionLabel(geoQuestion.id, geoOptId);
      if (label && label !== geoOptId) return label;
    }
  }

  if (resp.organicCohort?.geoRegion) {
    return resp.organicCohort.geoRegion;
  }

  const c = (resp.country || '').toUpperCase();
  if (['US', 'CA', 'MX'].includes(c)) return 'North America';
  if (['GB', 'UK', 'DE', 'FR', 'NL', 'ES', 'IT', 'CH', 'SE', 'PL', 'NO', 'DK', 'FI', 'IE', 'BE', 'AT'].includes(c)) return 'Europe';
  if (['SG', 'JP', 'KR', 'CN', 'IN', 'TW', 'HK', 'AU', 'NZ', 'ID', 'MY', 'VN', 'TH', 'PH'].includes(c)) return 'Asia-Pacific';
  if (['BR', 'AR', 'CL', 'CO', 'PE'].includes(c)) return 'Latin America';
  if (['AE', 'SA', 'ZA', 'NG', 'EG', 'IL', 'TR', 'KE'].includes(c)) return 'Middle East & Africa';
  return 'Global / Decentralized';
}

function deriveDeviceClass(resp: Response): string {
  const d = (resp.deviceType || resp.organicCohort?.deviceClass || '').toLowerCase();
  if (d.includes('mobile') || d.includes('phone') || d.includes('ios') || d.includes('android')) return 'Mobile';
  if (d.includes('tablet') || d.includes('ipad')) return 'Tablet';
  return 'Desktop';
}

function deriveActivityTier(resp: Response): string {
  if (resp.organicCohort?.activityTier) return resp.organicCohort.activityTier;
  if (resp.organicCohort?.isReturning) return 'Returning Respondent';
  return 'Verified Consensus';
}

export const D3DemographicCluster: React.FC<D3DemographicClusterProps> = ({
  questions,
  responses,
  userResponseId,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<DemographicNode | null>(null);
  const [clusterMode, setClusterMode] = useState<ClusterMode>('geo');

  const ageQuestion = useMemo(() => questions.find((q) => q.demographicType === 'age'), [questions]);
  const geoQuestion = useMemo(() => questions.find((q) => q.demographicType === 'country'), [questions]);

  const getOptionLabel = (qId: string, optId: string) => {
    const q = questions.find((item) => item.id === qId);
    if (!q || !q.options) return optId;
    const opt = q.options.find((o) => o.id === optId);
    return opt ? opt.text : optId;
  };

  // Node definitions with organic fallback
  const nodes: DemographicNode[] = useMemo(() => {
    return responses.map((resp, i) => {
      const ageOptId = ageQuestion ? resp.answers[ageQuestion.id] : undefined;
      const ageGroup = ageOptId ? getOptionLabel(ageQuestion!.id, ageOptId) : 'Standard Cohort';
      const geoRegion = deriveGeoRegion(resp, geoQuestion, getOptionLabel);
      const deviceClass = deriveDeviceClass(resp);
      const activityTier = deriveActivityTier(resp);
      const isUser = resp.id === userResponseId || (!!userResponseId && resp.id === userResponseId);

      return {
        id: resp.id,
        ageGroup,
        geoRegion,
        country: resp.country || 'Global',
        deviceClass,
        activityTier,
        ipHashShort: resp.ipHash ? `ip_${resp.ipHash.slice(0, 7)}` : 'anon_node',
        isUser,
        answers: resp.answers,
        radius: isUser ? 13 : 7,
      };
    });
  }, [responses, questions, ageQuestion, geoQuestion, userResponseId]);

  // Dynamic configurations based on active mode
  const modeConfig = useMemo(() => {
    if (clusterMode === 'device') {
      const categories = ['Desktop', 'Mobile', 'Tablet'];
      const colors = ['#3B82F6', '#10B981', '#F59E0B'];
      return {
        title: 'Platform & Device Clusters',
        subtitle: 'Responses grouped by respondent hardware class detected via user-agent signals.',
        categories,
        colorScale: d3.scaleOrdinal<string>().domain(categories).range(colors),
        getCategory: (n: DemographicNode) => n.deviceClass,
      };
    }

    if (clusterMode === 'activity') {
      const categories = ['Returning Respondent', 'Verified Consensus'];
      const colors = ['#8B5CF6', '#10B981'];
      return {
        title: 'Activity & Consensus Clusters',
        subtitle: 'Responses classified by repeat participation and consensus verification weight.',
        categories,
        colorScale: d3.scaleOrdinal<string>().domain(categories).range(colors),
        getCategory: (n: DemographicNode) => n.activityTier,
      };
    }

    // Default 'geo'
    const categories = ['North America', 'Europe', 'Asia-Pacific', 'Latin America', 'Middle East & Africa', 'Global / Decentralized'];
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#64748B'];
    return {
      title: 'Geographic Demographic Clusters',
      subtitle: 'Organic regional cohorts derived from demographic answers and network geolocation.',
      categories,
      colorScale: d3.scaleOrdinal<string>().domain(categories).range(colors),
      getCategory: (n: DemographicNode) => n.geoRegion,
    };
  }, [clusterMode]);

  // Aggregate counts for legend
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    modeConfig.categories.forEach((cat) => {
      counts[cat] = 0;
    });
    nodes.forEach((node) => {
      const cat = modeConfig.getCategory(node);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [nodes, modeConfig]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = containerRef.current.clientWidth || 700;
    const height = 400;

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);

    const categories = modeConfig.categories;

    // Simulation Setup
    const simulation = d3
      .forceSimulation<DemographicNode>(nodes)
      .force('charge', d3.forceManyBody().strength(-16))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<DemographicNode>().radius((d) => d.radius + 3))
      .force('y', d3.forceY<DemographicNode>().y(height / 2).strength(0.18))
      .force(
        'x',
        d3.forceX<DemographicNode>().x((d) => {
          const cat = modeConfig.getCategory(d);
          const catIndex = Math.max(0, categories.indexOf(cat));
          const step = width / (categories.length + 1);
          return step * (catIndex + 1);
        }).strength(0.24)
      );

    // Node Groups
    const nodeGroup = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .on('click', (_, d) => setSelectedNode(d));

    // Outer pulsating halo for user node
    nodeGroup
      .filter((d) => d.isUser)
      .append('circle')
      .attr('r', 20)
      .attr('fill', 'none')
      .attr('stroke', '#6366F1')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 2')
      .append('animateTransform')
      .attr('attributeName', 'transform')
      .attr('type', 'rotate')
      .attr('from', '0 0 0')
      .attr('to', '360 0 0')
      .attr('dur', '8s')
      .attr('repeatCount', 'indefinite');

    // Main Circle
    nodeGroup
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => (d.isUser ? '#4F46E5' : modeConfig.colorScale(modeConfig.getCategory(d))))
      .attr('stroke', (d) => (d.isUser ? '#FFFFFF' : '#0F172A'))
      .attr('stroke-width', (d) => (d.isUser ? 3 : 1.5))
      .attr('opacity', 0.92);

    // User Label
    nodeGroup
      .filter((d) => d.isUser)
      .append('text')
      .text('YOU')
      .attr('text-anchor', 'middle')
      .attr('dy', -18)
      .attr('font-size', '10px')
      .attr('font-weight', '800')
      .attr('fill', '#818CF8');

    // Tick Animation
    simulation.on('tick', () => {
      nodeGroup.attr('transform', (d) => {
        const cx = Math.max(25, Math.min(width - 25, d.x || 0));
        const cy = Math.max(30, Math.min(height - 30, d.y || 0));
        return `translate(${cx},${cy})`;
      });
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, modeConfig]);

  return (
    <div ref={containerRef} className="w-full bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-sm relative space-y-4">
      {/* Top Header & Grouping Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-wide uppercase text-slate-300">
              {modeConfig.title}
            </h3>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
              {nodes.length} Nodes
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {modeConfig.subtitle}
          </p>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-lg border border-slate-700/80 self-start sm:self-auto">
          <button
            onClick={() => setClusterMode('geo')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              clusterMode === 'geo'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe size={12} />
            Region
          </button>
          <button
            onClick={() => setClusterMode('device')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              clusterMode === 'device'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={12} />
            Device
          </button>
          <button
            onClick={() => setClusterMode('activity')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              clusterMode === 'activity'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck size={12} />
            Cohort Tier
          </button>
        </div>
      </div>

      {/* Dynamic Cohort Legend */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {modeConfig.categories.map((cat) => {
          const count = categoryCounts[cat] || 0;
          if (count === 0 && clusterMode === 'geo') return null;
          const color = modeConfig.colorScale(cat);
          const pct = nodes.length > 0 ? Math.round((count / nodes.length) * 100) : 0;

          return (
            <div
              key={cat}
              className="flex items-center gap-1.5 bg-slate-800/50 border border-slate-800 px-2.5 py-1 rounded-md text-[11px]"
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
              <span className="text-slate-300 font-medium">{cat}:</span>
              <span className="text-slate-400 font-mono text-[10px]">{count} ({pct}%)</span>
            </div>
          );
        })}

        {userResponseId && (
          <div className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-700/60 px-2.5 py-1 rounded-md text-[11px] ml-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-300"></span>
            <span className="font-semibold text-indigo-200">Your Placement</span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <svg ref={svgRef} className="w-full overflow-visible min-h-[380px]"></svg>

      {/* Selected Node Details Box */}
      {selectedNode ? (
        <div className="p-3.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                {selectedNode.isUser ? 'Your Placement Node' : 'Respondent Node Profile'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                {selectedNode.ipHashShort}
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-white text-xs underline"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300 pt-1 border-t border-slate-700/50">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Region</span>
              <span className="font-medium text-slate-200">{selectedNode.geoRegion} ({selectedNode.country})</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Device Class</span>
              <span className="font-medium text-slate-200">{selectedNode.deviceClass}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Cohort Activity</span>
              <span className="font-medium text-slate-200">{selectedNode.activityTier}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Demographic</span>
              <span className="font-medium text-slate-200">{selectedNode.ageGroup}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 text-center italic">
          Tip: Click any node in the cluster to inspect respondent hardware and organic classification.
        </p>
      )}
    </div>
  );
};

