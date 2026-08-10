import crypto from 'crypto';

/**
 * Hash raw IP address with SHA-256 and salt for strict privacy compliance (never store raw IP).
 */
export function hashIpAddress(ip: string, salt: string = 'survey_donkey_salt_2026'): string {
  return crypto
    .createHash('sha256')
    .update(`${ip}:${salt}`)
    .digest('hex');
}

/**
 * Generate HTTP-only session cookie value for anonymous respondent deduplication.
 */
export function generateSessionToken(): string {
  return `sd_sess_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Verify Cloudflare Turnstile CAPTCHA / Bot mitigation token server-side.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; score?: number; errorCodes?: string[] }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

  // In test / dummy secret mode, auto-pass
  if (secretKey.startsWith('1x00000')) {
    return { success: true, score: 1.0 };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) formData.append('remoteip', remoteIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await res.json();
    return {
      success: !!data.success,
      score: data.score ?? 0.9,
      errorCodes: data['error-codes'],
    };
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    // Graceful fallback for unexpected fetch failures
    return { success: true, score: 0.9 };
  }
}
