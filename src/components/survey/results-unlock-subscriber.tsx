'use client';

import React, { useState } from 'react';
import { subscribeUnlockAlertAction } from '@/actions/survey-actions';

interface ResultsUnlockSubscriberProps {
  surveyId: string;
}

export const ResultsUnlockSubscriber: React.FC<ResultsUnlockSubscriberProps> = ({ surveyId }) => {
  const [emailAlert, setEmailAlert] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubscribeAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAlert.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    const res = await subscribeUnlockAlertAction(surveyId, emailAlert.trim());
    setSubmitting(false);

    if (res.success) {
      setEmailSent(true);
    } else {
      setErrorMsg(res.error || 'Failed to subscribe.');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded border border-amber-200 dark:border-amber-800/80 space-y-3">
      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
        Get Notified via Email When Unlocked
      </span>

      {emailSent ? (
        <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded border border-emerald-200 font-medium">
          ✓ Notification active! We will email you the survey results as soon as they unlock.
        </div>
      ) : (
        <form onSubmit={handleSubscribeAlert} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={emailAlert}
            onChange={(e) => setEmailAlert(e.target.value)}
            placeholder="Enter email for unlock alert..."
            className="flex-1 p-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            required
            disabled={submitting}
          />
          <button type="submit" disabled={submitting} className="btn-primary text-xs whitespace-nowrap">
            {submitting ? 'Subscribing...' : 'Notify Me'}
          </button>
        </form>
      )}

      {errorMsg && (
        <p className="text-[11px] text-red-600 font-medium">{errorMsg}</p>
      )}
    </div>
  );
};
