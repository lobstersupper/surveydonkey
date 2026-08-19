'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { auth } from '@/auth';
import { surveyRepository } from '@/lib/repository';
import { ResultsUnlockConfig } from '@/db/schema';
import { hashIpAddress, verifyTurnstileToken } from '@/lib/security';

export interface CreateSurveyInput {
  title: string;
  description?: string;
  creatorId?: string;
  resultsUnlockConfig: ResultsUnlockConfig;
  questions: Array<{
    text: string;
    isDemographicFlag: boolean;
    demographicType?: string;
    options: Array<{ id: string; text: string; nextQuestionId?: string }>;
  }>;
}

export async function createSurveyAction(input: CreateSurveyInput) {
  try {
    const session = await auth();
    const creatorId = session?.user?.id;

    if (!creatorId) {
      return {
        success: false,
        error: 'Authentication required. Please create an account or sign in to publish your survey.',
      };
    }

    if (!input.title.trim()) {
      return { success: false, error: 'Survey title is required.' };
    }

    if (!input.questions || input.questions.length === 0) {
      return { success: false, error: 'At least one question is required.' };
    }

    const res = await surveyRepository.createSurvey({
      title: input.title,
      description: input.description,
      creatorId,
      resultsUnlockConfig: input.resultsUnlockConfig,
      questions: input.questions,
    });

    if (res.success && res.survey) {
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/admin');
      return { success: true, surveyId: res.survey.id };
    }

    return { success: false, error: res.error || 'Failed to create survey.' };
  } catch (error) {
    console.error('createSurveyAction error:', error);
    return { success: false, error: 'Internal server error while creating survey.' };
  }
}

export async function updateSurveyStatusAction(
  surveyId: string,
  status: 'draft' | 'active' | 'closed'
) {
  try {
    const res = await surveyRepository.updateSurveyStatus(surveyId, status);
    if (res.success) {
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/admin');
      revalidatePath(`/surveys/${surveyId}`);
      return { success: true };
    }
    return { success: false, error: res.error };
  } catch (error) {
    console.error('updateSurveyStatusAction error:', error);
    return { success: false, error: 'Failed to update survey status.' };
  }
}

export async function deleteSurveyAction(surveyId: string) {
  try {
    const res = await surveyRepository.deleteSurvey(surveyId);
    if (res.success) {
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/admin');
      return { success: true };
    }
    return { success: false, error: res.error };
  } catch (error) {
    console.error('deleteSurveyAction error:', error);
    return { success: false, error: 'Failed to delete survey.' };
  }
}

export async function toggleResultsUnlockAction(surveyId: string, unlocked?: boolean) {
  try {
    const res = await surveyRepository.toggleSurveyResultsUnlock(surveyId, unlocked);
    if (res.success) {
      revalidatePath(`/surveys/${surveyId}/results`);
      revalidatePath('/dashboard');
      return { success: true, isUnlocked: res.isUnlocked };
    }
    return { success: false, error: res.error };
  } catch (error) {
    console.error('toggleResultsUnlockAction error:', error);
    return { success: false, error: 'Failed to toggle unlock.' };
  }
}

export interface SubmitResponseInput {
  surveyId: string;
  answers: Record<string, string>;
  fingerprintHash: string;
  turnstileToken?: string | null;
  clientTimezone?: string | null;
  clientCountry?: string | null;
  clientRegion?: string | null;
  clientCity?: string | null;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | string | null;
  browserLanguage?: string | null;
}

export async function submitResponseAction(input: SubmitResponseInput) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;

    // Get client IP
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    const realIp = headerList.get('x-real-ip');
    const rawIp = (forwardedFor ? forwardedFor.split(',')[0] : realIp) || '127.0.0.1';
    const ipHash = hashIpAddress(rawIp.trim());

    // Extract Edge Geolocation and Locale Headers (Vercel, Cloudflare, standard proxies)
    const edgeCountry = headerList.get('x-vercel-ip-country') || headerList.get('cf-ipcountry');
    const edgeRegion =
      headerList.get('x-vercel-ip-country-region') || headerList.get('cf-region-code');
    const edgeCity = headerList.get('x-vercel-ip-city') || headerList.get('cf-ipcity');
    const edgeTimezone = headerList.get('x-vercel-ip-timezone') || headerList.get('cf-timezone');
    const acceptLanguage = headerList.get('accept-language')?.split(',')[0]?.split(';')[0];

    // Merge edge geo with client runtime metadata
    const timezone = edgeTimezone || input.clientTimezone || 'UTC';

    let resolvedCountry = edgeCountry || input.clientCountry;
    if (!resolvedCountry || resolvedCountry === 'XX') {
      if (timezone.includes('America/')) resolvedCountry = 'US';
      else if (timezone.includes('Europe/London')) resolvedCountry = 'GB';
      else if (timezone.includes('Europe/')) resolvedCountry = 'DE';
      else if (timezone.includes('Asia/Tokyo')) resolvedCountry = 'JP';
      else if (timezone.includes('Asia/Singapore') || timezone.includes('Asia/'))
        resolvedCountry = 'SG';
      else if (timezone.includes('Australia/')) resolvedCountry = 'AU';
      else resolvedCountry = 'US';
    }

    const resolvedRegion = edgeRegion || input.clientRegion || null;
    const resolvedCity = edgeCity || input.clientCity || null;
    const resolvedDevice = input.deviceType || 'desktop';
    const resolvedLanguage = input.browserLanguage || acceptLanguage || 'en';

    // Get or create session cookie
    const cookieStore = await cookies();
    let sessionCookie = cookieStore.get('sd_session')?.value;
    if (!sessionCookie) {
      sessionCookie = `sd_sess_${Math.random().toString(36).substring(2)}${Date.now()}`;
      cookieStore.set('sd_session', sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    // Verify Turnstile if token passed
    let turnstileScore = '1.0';
    if (input.turnstileToken) {
      const verify = await verifyTurnstileToken(input.turnstileToken, rawIp);
      if (!verify.success) {
        return {
          success: false,
          error: 'Bot verification check failed. Please refresh and try again.',
        };
      }
      turnstileScore = String(verify.score || 1.0);
    }

    const res = await surveyRepository.submitResponse({
      surveyId: input.surveyId,
      userId,
      answers: input.answers,
      sessionCookie,
      ipHash,
      fingerprintHash: input.fingerprintHash,
      turnstileScore,
      country: resolvedCountry,
      region: resolvedRegion,
      city: resolvedCity,
      timezone,
      deviceType: resolvedDevice,
      browserLanguage: resolvedLanguage,
    });

    if (res.success && res.response) {
      revalidatePath('/');
      revalidatePath(`/surveys/${input.surveyId}/results`);
      return { success: true, responseId: res.response.id };
    }

    return {
      success: false,
      error: res.error || 'Submission blocked. You may have already completed this survey.',
    };
  } catch (error) {
    console.error('submitResponseAction error:', error);
    return { success: false, error: 'Internal error while processing survey response.' };
  }
}

export async function subscribeUnlockAlertAction(surveyId: string, email: string) {
  try {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    const res = await surveyRepository.subscribeEmailAlert(surveyId, email);
    return res;
  } catch (error) {
    console.error('subscribeUnlockAlertAction error:', error);
    return { success: false, error: 'Failed to register email alert.' };
  }
}

export async function uploadMediaAssetAction(fileName: string, fileSize: string) {
  try {
    const asset = await surveyRepository.addMediaAsset({
      name: fileName,
      url: `https://assets.surveydonkey.com/media/${encodeURIComponent(fileName)}`,
      size: fileSize,
    });
    revalidatePath('/admin');
    return { success: true, asset };
  } catch (error) {
    console.error('uploadMediaAssetAction error:', error);
    return { success: false, error: 'Failed to save media asset.' };
  }
}
