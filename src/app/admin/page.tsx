'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Survey } from '@/db/schema';
import {
  updateSurveyStatusAction,
  deleteSurveyAction,
  uploadMediaAssetAction,
} from '@/actions/survey-actions';
import { MediaAsset } from '@/lib/repository';

interface AdminSurvey extends Survey {
  responsesCount: number;
}

export default function SuperadminPage() {
  const { data: session } = useSession();
  const [allSurveys, setAllSurveys] = useState<AdminSurvey[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 3,
    totalSurveys: 3,
    totalResponses: 170,
  });
  const [blobFiles, setBlobFiles] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentUser = session?.user || {
    name: 'Super Admin',
    email: 'admin@surveydonkey.com',
    role: 'superadmin',
  };

  const userRole = (currentUser as { role?: string }).role || 'superadmin';

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setAllSurveys(data.surveys || []);
        if (data.stats) setStats(data.stats);
        if (data.assets) setBlobFiles(data.assets);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [userRole]);

  const handleToggleSurveyStatus = async (
    surveyId: string,
    newStatus: 'draft' | 'active' | 'closed'
  ) => {
    setActionError(null);
    const res = await updateSurveyStatusAction(surveyId, newStatus);
    if (res.success) {
      await fetchAdminData();
    } else {
      setActionError(res.error || 'Failed to update status');
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    if (confirm('Admin action: Permanently purge survey and all associated response records?')) {
      setActionError(null);
      const res = await deleteSurveyAction(surveyId);
      if (res.success) {
        await fetchAdminData();
      } else {
        setActionError(res.error || 'Failed to delete survey');
      }
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const size = `${Math.max(1, Math.round(file.size / 1024))} KB`;
    const res = await uploadMediaAssetAction(file.name, size);
    setUploading(false);

    if (res.success && res.asset) {
      setBlobFiles((prev) => [res.asset!, ...prev]);
    }
  };

  if (userRole !== 'superadmin' && !currentUser.email?.includes('admin')) {
    return (
      <div className="card-high-signal text-center py-16 max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto font-bold text-xl">
          🔒
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Access Restricted</h2>
        <p className="text-xs text-slate-500">
          Admin permissions required. Switch your role to <strong>Admin (Superadmin)</strong> in the top-right header switcher to test this panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Superadmin Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            System Admin Panel
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            Global Moderation & Asset Control
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Admin: {currentUser.email}
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="btn-secondary text-xs"
        >
          ↻ Refresh Data
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* Global Analytics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-high-signal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Registered Users
          </span>
          <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
            {stats.totalUsers}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Superadmins & Creators</span>
        </div>

        <div className="card-high-signal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Total Surveys Hosted
          </span>
          <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
            {stats.totalSurveys}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Active, Draft, & Closed</span>
        </div>

        <div className="card-high-signal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Total Response Records
          </span>
          <span className="text-3xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
            {stats.totalResponses}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Verified Submissions</span>
        </div>
      </div>

      {/* Content Moderation Table */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Global Content Moderation Queue ({allSurveys.length})
        </h2>

        {loading ? (
          <div className="card-high-signal text-center py-12">
            <p className="text-xs text-slate-500">Loading moderation records...</p>
          </div>
        ) : (
          <div className="card-high-signal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Survey Title</th>
                  <th className="p-3">Creator ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Responses</th>
                  <th className="p-3 text-right">Admin Control Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {allSurveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {survey.title}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {survey.creatorId}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          survey.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : survey.status === 'draft'
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {survey.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{survey.responsesCount}</td>
                    <td className="p-3 text-right space-x-2">
                      {survey.status === 'active' ? (
                        <button
                          onClick={() => handleToggleSurveyStatus(survey.id, 'closed')}
                          className="px-2 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded text-[10px] font-bold uppercase dark:bg-amber-950 dark:text-amber-300"
                        >
                          Suspend / Close
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleSurveyStatus(survey.id, 'active')}
                          className="px-2 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded text-[10px] font-bold uppercase dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          Activate
                        </button>
                      )}

                      <Link
                        href={`/surveys/${survey.id}/results`}
                        className="px-2 py-1 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded text-[10px] font-bold uppercase dark:bg-slate-800 dark:text-slate-200 inline-block"
                      >
                        Audit Results
                      </Link>

                      <button
                        onClick={() => handleDeleteSurvey(survey.id)}
                        className="px-2 py-1 bg-red-600 text-white hover:bg-red-700 rounded text-[10px] font-bold uppercase"
                      >
                        Purge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Platform Media Asset Manager */}
      <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Media & Asset Manager
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage platform media assets and survey images.
            </p>
          </div>

          <label className="btn-primary text-xs cursor-pointer">
            {uploading ? 'Uploading...' : '+ Upload Media Asset'}
            <input
              type="file"
              onChange={handleMediaUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        <div className="card-high-signal bg-slate-900 text-white p-6 rounded-lg space-y-4">
          <div className="space-y-2">
            {blobFiles.map((file) => (
              <div
                key={file.id}
                className="p-3 bg-slate-800/80 border border-slate-700 rounded flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-indigo-400">📄</span>
                  <div>
                    <p className="font-semibold text-slate-200">{file.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{file.url}</p>
                  </div>
                </div>
                <span className="font-mono text-slate-400">{file.size}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
