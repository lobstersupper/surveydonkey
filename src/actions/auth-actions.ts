'use server';

import { headers } from 'next/headers';
import { surveyRepository } from '@/lib/repository';
import { verifyTurnstileToken } from '@/lib/security';
import { sendVerificationEmail } from '@/lib/email';

export interface RegisterAccountInput {
  name: string;
  email: string;
  password?: string;
  role?: 'creator' | 'respondent';
  turnstileToken?: string | null;
}

export async function registerAccountAction(input: RegisterAccountInput) {
  try {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password?.trim() || 'password123';
    const role = input.role || 'creator';

    if (!name || name.length < 2) {
      return { success: false, error: 'Please enter a valid name (at least 2 characters).' };
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return { success: false, error: 'Please provide a valid email address.' };
    }

    if (password && password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    // 1. Verify Cloudflare Turnstile bot challenge
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    const realIp = headerList.get('x-real-ip');
    const rawIp = (forwardedFor ? forwardedFor.split(',')[0] : realIp) || '127.0.0.1';

    if (!input.turnstileToken) {
      return {
        success: false,
        error: 'Security challenge failed. Please complete the verification check.',
      };
    }

    const turnstileResult = await verifyTurnstileToken(input.turnstileToken, rawIp.trim());
    if (!turnstileResult.success) {
      return {
        success: false,
        error: 'Bot verification check failed. Please refresh and try again.',
      };
    }

    // 2. Check if user already exists
    const existingUser = await surveyRepository.getUserByEmail(email);
    if (existingUser) {
      // If user exists and is not verified, allow re-sending verification code
      if (!existingUser.emailVerified) {
        const code = await surveyRepository.createVerificationCode(email, 15);
        const emailRes = await sendVerificationEmail({ email, name, code });
        return {
          success: true,
          requireVerification: true,
          email,
          devCode: emailRes.devCode,
        };
      }
      return {
        success: false,
        error: 'An account with this email address already exists. Please sign in.',
      };
    }

    // 3. Create user with pending email verification (emailVerified: null)
    const res = await surveyRepository.createUser({
      name,
      email,
      password,
      role,
      emailVerified: null,
    });

    if (!res.success || !res.user) {
      return { success: false, error: res.error || 'Failed to create account.' };
    }

    // 4. Generate and send 6-digit verification code via Resend
    const code = await surveyRepository.createVerificationCode(email, 15);
    const emailRes = await sendVerificationEmail({ email, name, code });

    return {
      success: true,
      requireVerification: true,
      email,
      devCode: emailRes.devCode,
    };
  } catch (error) {
    console.error('registerAccountAction error:', error);
    return { success: false, error: 'Internal server error while registering account.' };
  }
}

export async function verifyEmailCodeAction(params: { email: string; code: string }) {
  try {
    const email = params.email?.trim().toLowerCase();
    const code = params.code?.trim();

    if (!email || !code || code.length !== 6) {
      return { success: false, error: 'Please enter a valid 6-digit verification code.' };
    }

    const res = await surveyRepository.verifyEmailCode(email, code);
    if (!res.success) {
      return { success: false, error: res.error || 'Invalid verification code.' };
    }

    return { success: true };
  } catch (error) {
    console.error('verifyEmailCodeAction error:', error);
    return { success: false, error: 'Internal server error during verification.' };
  }
}

export async function resendVerificationCodeAction(params: { email: string }) {
  try {
    const email = params.email?.trim().toLowerCase();
    if (!email) {
      return { success: false, error: 'Email address is required.' };
    }

    const user = await surveyRepository.getUserByEmail(email);
    if (!user) {
      return { success: false, error: 'Account not found.' };
    }

    const code = await surveyRepository.createVerificationCode(email, 15);
    const emailRes = await sendVerificationEmail({
      email,
      name: user.name || 'there',
      code,
    });

    return { success: true, devCode: emailRes.devCode };
  } catch (error) {
    console.error('resendVerificationCodeAction error:', error);
    return { success: false, error: 'Failed to resend verification code.' };
  }
}
