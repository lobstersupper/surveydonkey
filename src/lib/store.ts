import {
  INITIAL_USERS,
  INITIAL_SURVEYS,
  INITIAL_QUESTIONS,
  INITIAL_RESPONSES,
} from './mock-data';
import { User, Survey, Question, Response, ResultsUnlockConfig } from '@/db/schema';
import { checkDuplicateResponse, DeduplicationCheckParams, DeduplicationCheckResult } from './deduplication';

class SurveyStore {
  private users: User[] = [...INITIAL_USERS];
  private surveys: Survey[] = [...INITIAL_SURVEYS];
  private questions: Question[] = [...INITIAL_QUESTIONS];
  private responses: Response[] = [...INITIAL_RESPONSES];
  private currentUserId: string = 'user_creator_1'; // Default logged in as Creator

  // --- User Management ---
  getUsers(): User[] {
    return this.users;
  }

  getCurrentUser(): User {
    return (
      this.users.find((u) => u.id === this.currentUserId) ||
      this.users[1] // Fallback to Creator
    );
  }

  setCurrentUser(userId: string) {
    const found = this.users.find((u) => u.id === userId);
    if (found) {
      this.currentUserId = found.id;
    }
  }

  // --- Survey Management ---
  getSurveys(): Survey[] {
    return this.surveys;
  }

  getSurveyById(id: string): Survey | undefined {
    return this.surveys.find((s) => s.id === id);
  }

  getSurveysByCreator(creatorId: string): Survey[] {
    return this.surveys.filter((s) => s.creatorId === creatorId);
  }

  getActiveSurveyByCreator(creatorId: string): Survey | undefined {
    return this.surveys.find((s) => s.creatorId === creatorId && s.status === 'active');
  }

  createSurvey(surveyData: {
    title: string;
    description?: string;
    creatorId: string;
    resultsUnlockConfig: ResultsUnlockConfig;
    questions: Array<{
      text: string;
      isDemographicFlag: boolean;
      demographicType?: string;
      options: Array<{ id: string; text: string; nextQuestionId?: string }>;
    }>;
  }): { success: boolean; survey?: Survey; error?: string } {
    // Platform Economics check: Limit standard Creators to 1 active survey at a time
    const activeSurvey = this.getActiveSurveyByCreator(surveyData.creatorId);
    let initialStatus: 'draft' | 'active' = 'active';

    if (activeSurvey) {
      // Auto-set as draft if creator already has an active survey
      initialStatus = 'draft';
    }

    const surveyId = `survey_${Date.now()}`;
    const newSurvey: Survey = {
      id: surveyId,
      creatorId: surveyData.creatorId,
      title: surveyData.title,
      description: surveyData.description || '',
      status: initialStatus,
      resultsUnlockConfig: surveyData.resultsUnlockConfig,
      createdAt: new Date(),
    };

    this.surveys.unshift(newSurvey);

    // Save Questions
    surveyData.questions.forEach((q, idx) => {
      const newQ: Question = {
        id: `q_${surveyId}_${idx}`,
        surveyId,
        text: q.text,
        isDemographicFlag: q.isDemographicFlag,
        demographicType: q.demographicType || null,
        options: q.options,
        orderIndex: idx,
      };
      this.questions.push(newQ);
    });

    return { success: true, survey: newSurvey };
  }

  updateSurveyStatus(
    surveyId: string,
    status: 'draft' | 'active' | 'closed'
  ): { success: boolean; error?: string } {
    const survey = this.getSurveyById(surveyId);
    if (!survey) return { success: false, error: 'Survey not found' };

    if (status === 'active') {
      // Check if creator already has an active survey (excluding current)
      const existingActive = this.surveys.find(
        (s) => s.creatorId === survey.creatorId && s.status === 'active' && s.id !== surveyId
      );
      if (existingActive) {
        // Auto-archive/close previous active survey to enforce 1 active survey limit
        existingActive.status = 'closed';
      }
    }

    survey.status = status;
    return { success: true };
  }

  toggleSurveyResultsUnlock(surveyId: string, unlocked?: boolean): { success: boolean } {
    const survey = this.getSurveyById(surveyId);
    if (survey && survey.resultsUnlockConfig) {
      survey.resultsUnlockConfig = {
        ...survey.resultsUnlockConfig,
        unlocked: unlocked !== undefined ? unlocked : !survey.resultsUnlockConfig.unlocked,
      };
    }
    return { success: true };
  }

  deleteSurvey(surveyId: string): { success: boolean } {
    this.surveys = this.surveys.filter((s) => s.id !== surveyId);
    this.questions = this.questions.filter((q) => q.surveyId !== surveyId);
    this.responses = this.responses.filter((r) => r.surveyId !== surveyId);
    return { success: true };
  }

  // --- Questions Management ---
  getQuestionsBySurvey(surveyId: string): Question[] {
    return this.questions
      .filter((q) => q.surveyId === surveyId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  // --- Response & Deduplication Engine ---
  getResponsesBySurvey(surveyId: string): Response[] {
    return this.responses.filter((r) => r.surveyId === surveyId);
  }

  submitResponse(params: {
    surveyId: string;
    userId?: string | null;
    answers: Record<string, string>;
    sessionCookie: string;
    ipHash: string;
    fingerprintHash: string;
    turnstileScore?: string;
    country?: string | null;
    region?: string | null;
    city?: string | null;
    timezone?: string | null;
    deviceType?: string | null;
    browserLanguage?: string | null;
  }): { success: boolean; response?: Response; deduplication?: DeduplicationCheckResult; error?: string } {
    // 1. Strict Database-level Deduplication Check
    const dedup = checkDuplicateResponse(this.responses, {
      surveyId: params.surveyId,
      userId: params.userId,
      sessionCookie: params.sessionCookie,
      ipHash: params.ipHash,
      fingerprintHash: params.fingerprintHash,
    });

    if (dedup.isDuplicate) {
      return {
        success: false,
        deduplication: dedup,
        error: 'You have already completed this survey.',
      };
    }

    // 2. Insert new Response record
    const newResponse: Response = {
      id: `resp_${Date.now()}`,
      surveyId: params.surveyId,
      userId: params.userId || null,
      answers: params.answers,
      sessionCookie: params.sessionCookie,
      ipHash: params.ipHash,
      fingerprintHash: params.fingerprintHash,
      turnstileScore: params.turnstileScore || '1.0',
      country: params.country || 'US',
      region: params.region || null,
      city: params.city || null,
      timezone: params.timezone || 'UTC',
      deviceType: params.deviceType || 'desktop',
      browserLanguage: params.browserLanguage || 'en',
      submittedAt: new Date(),
    };

    this.responses.push(newResponse);

    // 3. Auto-check if response threshold met to unlock results
    const survey = this.getSurveyById(params.surveyId);
    if (survey && survey.resultsUnlockConfig && survey.resultsUnlockConfig.type === 'threshold') {
      const totalCount = this.getResponsesBySurvey(params.surveyId).length;
      if (
        survey.resultsUnlockConfig.thresholdCount &&
        totalCount >= survey.resultsUnlockConfig.thresholdCount
      ) {
        survey.resultsUnlockConfig.unlocked = true;
      }
    }

    return { success: true, response: newResponse };
  }
}

// Global Singleton Store Instance
export const surveyStore = new SurveyStore();
