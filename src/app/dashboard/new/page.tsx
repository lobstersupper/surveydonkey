import { SurveyBuilder } from '@/components/survey/survey-builder';

export default function NewSurveyPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="badge-minimal">Creator Studio</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
          Create New Survey
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure questions, demographic filters, branching logic, and results unlock rules.
        </p>
      </div>

      <SurveyBuilder />
    </div>
  );
}
