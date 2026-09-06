'use client';

import React, { useState, useMemo } from 'react';
import { Table, ArrowRightLeft, Percent, Hash } from 'lucide-react';
import { Question, QuestionOption, Response } from '@/db/schema';

interface CrossTabMatrixProps {
  questions: Question[];
  responses: Response[];
}

export const CrossTabMatrix: React.FC<CrossTabMatrixProps> = ({ questions, responses }) => {
  if (questions.length < 2 || responses.length === 0) {
    return null;
  }

  // State: selected row and column questions
  const [rowQuestionId, setRowQuestionId] = useState<string>(questions[0].id);
  const [colQuestionId, setColQuestionId] = useState<string>(questions[1].id);
  const [metricMode, setMetricMode] = useState<'percentage' | 'count'>('percentage');

  const rowQuestion = useMemo(
    () => questions.find((q) => q.id === rowQuestionId) || questions[0],
    [questions, rowQuestionId]
  );
  const colQuestion = useMemo(
    () => questions.find((q) => q.id === colQuestionId) || questions[1],
    [questions, colQuestionId]
  );

  const rowOptions = (rowQuestion.options || []) as QuestionOption[];
  const colOptions = (colQuestion.options || []) as QuestionOption[];

  const handleSwapVariables = () => {
    const temp = rowQuestionId;
    setRowQuestionId(colQuestionId);
    setColQuestionId(temp);
  };

  // Compute 2D matrix
  const matrixData = useMemo(() => {
    const table: Record<string, Record<string, number>> = {};
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    let grandTotal = 0;

    rowOptions.forEach((rOpt) => {
      table[rOpt.id] = {};
      rowTotals[rOpt.id] = 0;
      colOptions.forEach((cOpt) => {
        table[rOpt.id][cOpt.id] = 0;
        colTotals[cOpt.id] = 0;
      });
    });

    responses.forEach((resp) => {
      const rVal = resp.answers[rowQuestion.id];
      const cVal = resp.answers[colQuestion.id];

      if (rVal && cVal && table[rVal] && table[rVal][cVal] !== undefined) {
        table[rVal][cVal]++;
        rowTotals[rVal]++;
        colTotals[cVal] = (colTotals[cVal] || 0) + 1;
        grandTotal++;
      }
    });

    return { table, rowTotals, colTotals, grandTotal };
  }, [rowQuestion, colQuestion, rowOptions, colOptions, responses]);

  return (
    <div className="card-high-signal p-6 rounded-xl space-y-5 border border-slate-200 dark:border-slate-800">
      {/* Header & Variable Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Table size={16} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Cross-Tabulation Correlation Matrix
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Compare answer distribution across two questions to uncover correlation patterns.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 self-start md:self-auto">
          <button
            onClick={() => setMetricMode('percentage')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
              metricMode === 'percentage'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Percent size={11} />
            Row %
          </button>
          <button
            onClick={() => setMetricMode('count')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
              metricMode === 'count'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Hash size={11} />
            Counts
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="flex flex-col md:flex-row items-end gap-3">
        <div className="flex-1 w-full">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Row Variable (Question A)
          </label>
          <select
            value={rowQuestionId}
            onChange={(e) => setRowQuestionId(e.target.value)}
            className="w-full p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
          >
            {questions.map((q, idx) => (
              <option key={q.id} value={q.id}>
                Q{idx + 1}: {q.text.length > 55 ? `${q.text.substring(0, 55)}...` : q.text}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleSwapVariables}
          className="btn-secondary text-xs p-2.5 flex items-center justify-center gap-1.5 self-center md:self-end text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
          title="Swap Row and Column Variables"
        >
          <ArrowRightLeft size={14} />
          <span className="hidden sm:inline">Swap</span>
        </button>

        <div className="flex-1 w-full">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Column Variable (Question B)
          </label>
          <select
            value={colQuestionId}
            onChange={(e) => setColQuestionId(e.target.value)}
            className="w-full p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
          >
            {questions.map((q, idx) => (
              <option key={q.id} value={q.id}>
                Q{idx + 1}: {q.text.length > 55 ? `${q.text.substring(0, 55)}...` : q.text}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rowQuestionId === colQuestionId && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <span>⚠️</span>
          <span>
            You are comparing the same question against itself. Select a distinct question for Column Variable to uncover cross-cutting insights.
          </span>
        </div>
      )}

      {/* Heatmap Matrix Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <th className="p-3 font-bold border-r border-slate-200 dark:border-slate-800 max-w-[180px]">
                {rowQuestion.text.length > 35 ? `${rowQuestion.text.substring(0, 35)}...` : rowQuestion.text}
              </th>
              {colOptions.map((cOpt) => (
                <th key={cOpt.id} className="p-3 font-semibold text-center min-w-[100px]">
                  {cOpt.text}
                </th>
              ))}
              <th className="p-3 font-bold text-center border-l border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rowOptions.map((rOpt) => {
              const rTotal = matrixData.rowTotals[rOpt.id] || 0;

              return (
                <tr
                  key={rOpt.id}
                  className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                    {rOpt.text}
                  </td>

                  {colOptions.map((cOpt) => {
                    const count = matrixData.table[rOpt.id]?.[cOpt.id] || 0;
                    const percent = rTotal > 0 ? Math.round((count / rTotal) * 100) : 0;

                    // Intensity for heatmap (0 - 100)
                    const opacity = Math.min(0.85, Math.max(0.04, percent / 100));

                    return (
                      <td
                        key={cOpt.id}
                        className="p-3 text-center font-mono relative transition-colors"
                        style={{
                          backgroundColor:
                            count > 0 ? `rgba(59, 130, 246, ${opacity})` : 'transparent',
                        }}
                      >
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {metricMode === 'percentage' ? `${percent}%` : count}
                        </div>
                        {metricMode === 'percentage' && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {count} votes
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className="p-3 font-bold text-center border-l border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-800/40 font-mono">
                    {rTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100/70 dark:bg-slate-800/70 font-bold border-t border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <td className="p-3 border-r border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                Column Total
              </td>
              {colOptions.map((cOpt) => (
                <td key={cOpt.id} className="p-3 text-center font-mono">
                  {matrixData.colTotals[cOpt.id] || 0}
                </td>
              ))}
              <td className="p-3 text-center font-mono bg-slate-200/60 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100">
                {matrixData.grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
