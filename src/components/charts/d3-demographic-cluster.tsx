'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Question, Response } from '@/db/schema';

interface D3DemographicClusterProps {
  questions: Question[];
  responses: Response[];
  userResponseId?: string | null;
}

interface DemographicNode extends d3.SimulationNodeDatum {
  id: string;
  ageGroup: string;
  geoRegion: string;
  isUser: boolean;
  answers: Record<string, string>;
  radius: number;
}

export const D3DemographicCluster: React.FC<D3DemographicClusterProps> = ({
  questions,
  responses,
  userResponseId,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<DemographicNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || responses.length === 0) return;

    // Clear previous SVG contents
    d3.select(svgRef.current).selectAll('*').remove();

    const width = containerRef.current.clientWidth || 700;
    const height = 420;

    // Map questions for labels
    const ageQuestion = questions.find((q) => q.demographicType === 'age');
    const geoQuestion = questions.find((q) => q.demographicType === 'country');

    const getOptionLabel = (qId: string, optId: string) => {
      const q = questions.find((item) => item.id === qId);
      if (!q || !q.options) return optId;
      const opt = q.options.find((o) => o.id === optId);
      return opt ? opt.text : optId;
    };

    // Prepare Node Data
    const nodes: DemographicNode[] = responses.map((resp, i) => {
      const ageOptId = ageQuestion ? resp.answers[ageQuestion.id] : undefined;
      const geoOptId = geoQuestion ? resp.answers[geoQuestion.id] : undefined;

      const ageGroup = ageOptId ? getOptionLabel(ageQuestion!.id, ageOptId) : 'Standard Cohort';
      const geoRegion = geoOptId ? getOptionLabel(geoQuestion!.id, geoOptId) : 'Global';
      const isUser = resp.id === userResponseId || i === responses.length - 1; // Highlight user or latest

      return {
        id: resp.id,
        ageGroup,
        geoRegion,
        isUser,
        answers: resp.answers,
        radius: isUser ? 14 : 7,
      };
    });

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);

    // Color Scale based on Geo Region or Age
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(['North America', 'Europe', 'Asia-Pacific', 'Latin America', 'Middle East & Africa'])
      .range(['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6']);

    // Force Simulation Setup
    const simulation = d3
      .forceSimulation<DemographicNode>(nodes)
      .force('charge', d3.forceManyBody().strength(-15))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<DemographicNode>().radius((d) => d.radius + 3))
      .force(
        'y',
        d3.forceY<DemographicNode>().y(height / 2).strength(0.15)
      )
      .force(
        'x',
        d3.forceX<DemographicNode>().x((d) => {
          if (d.geoRegion.includes('North America')) return width * 0.22;
          if (d.geoRegion.includes('Europe')) return width * 0.40;
          if (d.geoRegion.includes('Asia')) return width * 0.58;
          if (d.geoRegion.includes('Latin')) return width * 0.76;
          return width * 0.5;
        }).strength(0.2)
      );

    // Render Group Nodes
    const nodeGroup = svg
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .on('click', (_, d) => setSelectedNode(d));

    // Outer glow for user node
    nodeGroup
      .filter((d) => d.isUser)
      .append('circle')
      .attr('r', 22)
      .attr('fill', 'none')
      .attr('stroke', '#6366F1')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 2')
      .append('animateTransform')
      .attr('attributeName', 'transform')
      .attr('type', 'rotate')
      .attr('from', '0 0 0')
      .attr('to', '360 0 0')
      .attr('dur', '10s')
      .attr('repeatCount', 'indefinite');

    // Main Circle Nodes
    nodeGroup
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => (d.isUser ? '#4F46E5' : colorScale(d.geoRegion)))
      .attr('stroke', (d) => (d.isUser ? '#FFFFFF' : '#0F172A'))
      .attr('stroke-width', (d) => (d.isUser ? 3 : 1))
      .attr('opacity', 0.9);

    // User Label
    nodeGroup
      .filter((d) => d.isUser)
      .append('text')
      .text('YOU')
      .attr('text-anchor', 'middle')
      .attr('dy', -20)
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', '#4F46E5');

    // Update Simulation Positions with Boundary Clamping
    simulation.on('tick', () => {
      nodeGroup.attr('transform', (d) => {
        const cx = Math.max(30, Math.min(width - 30, d.x || 0));
        const cy = Math.max(35, Math.min(height - 35, d.y || 0));
        return `translate(${cx},${cy})`;
      });
    });

    return () => {
      simulation.stop();
    };
  }, [questions, responses, userResponseId]);

  return (
    <div ref={containerRef} className="w-full bg-slate-900 text-white rounded-lg p-6 border border-slate-800 relative">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400">
            Demographic Distribution
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Visual breakdown of responses across age cohorts and geographic regions.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600 ring-2 ring-indigo-400 inline-block"></span>
            <span className="font-semibold text-indigo-300">Where YOU Sit</span>
          </div>
        </div>
      </div>

      <svg ref={svgRef} className="w-full overflow-visible"></svg>

      {/* Selected Node Details Box */}
      {selectedNode && (
        <div className="mt-4 p-3 bg-slate-800/90 border border-slate-700 rounded text-xs flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-200">
              Respondent Cohort Details ({selectedNode.isUser ? 'Your Placement' : 'Respondent Node'}):
            </span>{' '}
            <span className="text-slate-400">
              Age: {selectedNode.ageGroup} | Location: {selectedNode.geoRegion}
            </span>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-slate-400 hover:text-white text-xs underline ml-4"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
