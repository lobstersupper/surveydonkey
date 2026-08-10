import { Response } from '@/db/schema';

export interface DeduplicationCheckParams {
  surveyId: string;
  userId?: string | null;
  sessionCookie: string;
  ipHash: string;
  fingerprintHash: string;
}

export interface DeduplicationCheckResult {
  isDuplicate: boolean;
  matchedBy?: 'account' | 'session_cookie' | 'fingerprint' | 'ip_fingerprint';
  existingResponseId?: string;
}

/**
 * Perform multi-factor deduplication check against database responses list.
 */
export function checkDuplicateResponse(
  existingResponses: Response[],
  params: DeduplicationCheckParams
): DeduplicationCheckResult {
  const { surveyId, userId, sessionCookie, ipHash, fingerprintHash } = params;

  const surveyResponses = existingResponses.filter((r) => r.surveyId === surveyId);

  // 1. Check User Account ID if logged in
  if (userId) {
    const accountMatch = surveyResponses.find((r) => r.userId === userId);
    if (accountMatch) {
      return {
        isDuplicate: true,
        matchedBy: 'account',
        existingResponseId: accountMatch.id,
      };
    }
  }

  // 2. Check Session Cookie
  if (sessionCookie) {
    const cookieMatch = surveyResponses.find((r) => r.sessionCookie === sessionCookie);
    if (cookieMatch) {
      return {
        isDuplicate: true,
        matchedBy: 'session_cookie',
        existingResponseId: cookieMatch.id,
      };
    }
  }

  // 3. Check Client Device Fingerprint Hash
  if (fingerprintHash) {
    const fpMatch = surveyResponses.find((r) => r.fingerprintHash === fingerprintHash);
    if (fpMatch) {
      return {
        isDuplicate: true,
        matchedBy: 'fingerprint',
        existingResponseId: fpMatch.id,
      };
    }
  }

  // 4. Check IP Hash + Fingerprint combination
  if (ipHash && fingerprintHash) {
    const compositeMatch = surveyResponses.find(
      (r) => r.ipHash === ipHash && r.fingerprintHash === fingerprintHash
    );
    if (compositeMatch) {
      return {
        isDuplicate: true,
        matchedBy: 'ip_fingerprint',
        existingResponseId: compositeMatch.id,
      };
    }
  }

  return { isDuplicate: false };
}
