import { ResultsUnlockConfig } from '@/db/schema';

export interface UnlockStatus {
  isUnlocked: boolean;
  reason: string;
  currentResponses: number;
  requiredResponses?: number;
  unlockAtDate?: string;
  progressPercent: number;
}

/**
 * Evaluates whether survey results are unlocked for respondents according to creator config.
 */
export function checkResultsUnlockStatus(
  config: ResultsUnlockConfig | null,
  totalResponses: number
): UnlockStatus {
  if (!config) {
    return {
      isUnlocked: true,
      reason: 'Immediate unlock default',
      currentResponses: totalResponses,
      progressPercent: 100,
    };
  }

  if (config.unlocked) {
    return {
      isUnlocked: true,
      reason: 'Unlocked by creator',
      currentResponses: totalResponses,
      progressPercent: 100,
    };
  }

  switch (config.type) {
    case 'immediate':
      return {
        isUnlocked: true,
        reason: 'Immediate results enabled',
        currentResponses: totalResponses,
        progressPercent: 100,
      };

    case 'threshold': {
      const required = config.thresholdCount || 10;
      const isUnlocked = totalResponses >= required;
      const progressPercent = Math.min(100, Math.round((totalResponses / required) * 100));
      return {
        isUnlocked,
        reason: isUnlocked
          ? `Reached required threshold of ${required} respondents.`
          : `Waiting for ${required - totalResponses} more respondent(s) to unlock full consensus.`,
        currentResponses: totalResponses,
        requiredResponses: required,
        progressPercent,
      };
    }

    case 'scheduled': {
      if (!config.unlockAt) {
        return {
          isUnlocked: true,
          reason: 'No unlock date specified',
          currentResponses: totalResponses,
          progressPercent: 100,
        };
      }
      const targetTime = new Date(config.unlockAt).getTime();
      const now = Date.now();
      const isUnlocked = now >= targetTime;

      return {
        isUnlocked,
        reason: isUnlocked
          ? 'Scheduled unlock date reached.'
          : `Results locked until ${new Date(config.unlockAt).toLocaleString()}.`,
        currentResponses: totalResponses,
        unlockAtDate: config.unlockAt,
        progressPercent: isUnlocked ? 100 : 45,
      };
    }

    case 'manual':
      return {
        isUnlocked: false,
        reason: 'Results will be released by the creator after response collection completes.',
        currentResponses: totalResponses,
        progressPercent: 50,
      };

    default:
      return {
        isUnlocked: true,
        reason: 'Unlocked',
        currentResponses: totalResponses,
        progressPercent: 100,
      };
  }
}
