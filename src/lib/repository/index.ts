import fs from 'fs';
import path from 'path';
import {
  User,
  Survey,
  Question,
  Response,
  ResultsUnlockConfig,
} from '@/db/schema';
import {
  INITIAL_USERS,
  INITIAL_SURVEYS,
  INITIAL_QUESTIONS,
  INITIAL_RESPONSES,
} from '../mock-data';
import { checkDuplicateResponse, DeduplicationCheckParams, DeduplicationCheckResult } from '../deduplication';

export interface EmailSubscription {
  id: string;
  surveyId: string;
  email: string;
  createdAt: Date;
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  size: string;
  uploadedAt: Date;
}

export interface VerificationToken {
  identifier: string; // User email
  token: string;      // 6-digit OTP code
  expires: Date;
}

interface DatabaseSchema {
  users: User[];
  surveys: Survey[];
  questions: Question[];
  responses: Response[];
  subscriptions: EmailSubscription[];
  mediaAssets: MediaAsset[];
  verificationTokens: VerificationToken[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'surveydonkey-db.json');

class SurveyRepository {
  private inMemoryCache: DatabaseSchema | null = null;

  constructor() {
    this.initDatabase();
  }

  private initDatabase(): DatabaseSchema {
    if (this.inMemoryCache) {
      return this.inMemoryCache;
    }

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Revive date objects
        this.inMemoryCache = {
          users: (parsed.users || INITIAL_USERS).map((u: User) => ({
            ...u,
            createdAt: new Date(u.createdAt),
            emailVerified: u.emailVerified ? new Date(u.emailVerified) : null,
          })),
          surveys: (parsed.surveys || INITIAL_SURVEYS).map((s: Survey) => ({
            ...s,
            createdAt: new Date(s.createdAt),
          })),
          questions: parsed.questions || INITIAL_QUESTIONS,
          responses: (parsed.responses || INITIAL_RESPONSES).map((r: Response, idx: number) => ({
            ...r,
            country: r.country || (['US', 'GB', 'DE', 'SG', 'CA', 'JP', 'AU'][idx % 7]),
            region: r.region || null,
            city: r.city || null,
            timezone: r.timezone || (['America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Singapore', 'America/New_York'][idx % 5]),
            deviceType: r.deviceType || (['desktop', 'desktop', 'mobile', 'mobile', 'tablet'][idx % 5]),
            browserLanguage: r.browserLanguage || 'en-US',
            submittedAt: new Date(r.submittedAt),
          })),
          subscriptions: (parsed.subscriptions || []).map((sub: EmailSubscription) => ({
            ...sub,
            createdAt: new Date(sub.createdAt),
          })),
          mediaAssets: (parsed.mediaAssets || [
            {
              id: 'asset_1',
              name: 'survey_donkey_banner_hero.webp',
              url: 'https://assets.surveydonkey.com/media/hero.webp',
              size: '142 KB',
              uploadedAt: new Date('2026-01-10'),
            },
            {
              id: 'asset_2',
              name: 'demographic_infographic_template.png',
              url: 'https://assets.surveydonkey.com/media/template.png',
              size: '280 KB',
              uploadedAt: new Date('2026-01-15'),
            },
          ]).map((a: MediaAsset) => ({
            ...a,
            uploadedAt: new Date(a.uploadedAt),
          })),
          verificationTokens: (parsed.verificationTokens || []).map((vt: VerificationToken) => ({
            ...vt,
            expires: new Date(vt.expires),
          })),
        };
        return this.inMemoryCache;
      }
    } catch (err) {
      console.warn('Could not read existing database file, seeding defaults:', err);
    }

    // Seed initial dataset
    const initialData: DatabaseSchema = {
      users: [...INITIAL_USERS],
      surveys: [...INITIAL_SURVEYS],
      questions: [...INITIAL_QUESTIONS],
      responses: [...INITIAL_RESPONSES],
      subscriptions: [],
      mediaAssets: [
        {
          id: 'asset_1',
          name: 'survey_donkey_banner_hero.webp',
          url: 'https://assets.surveydonkey.com/media/hero.webp',
          size: '142 KB',
          uploadedAt: new Date('2026-01-10'),
        },
        {
          id: 'asset_2',
          name: 'demographic_infographic_template.png',
          url: 'https://assets.surveydonkey.com/media/template.png',
          size: '280 KB',
          uploadedAt: new Date('2026-01-15'),
        },
      ],
      verificationTokens: [],
    };

    this.inMemoryCache = initialData;
    this.saveDatabase();
    return this.inMemoryCache;
  }

  private saveDatabase(): void {
    if (!this.inMemoryCache) return;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.inMemoryCache, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  private getDB(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.inMemoryCache = {
          users: (parsed.users || INITIAL_USERS).map((u: User) => ({
            ...u,
            createdAt: new Date(u.createdAt),
            emailVerified: u.emailVerified ? new Date(u.emailVerified) : null,
          })),
          surveys: (parsed.surveys || INITIAL_SURVEYS).map((s: Survey) => ({
            ...s,
            createdAt: new Date(s.createdAt),
          })),
          questions: parsed.questions || INITIAL_QUESTIONS,
          responses: (parsed.responses || INITIAL_RESPONSES).map((r: Response, idx: number) => ({
            ...r,
            country: r.country || (['US', 'GB', 'DE', 'SG', 'CA', 'JP', 'AU'][idx % 7]),
            region: r.region || null,
            city: r.city || null,
            timezone: r.timezone || (['America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Singapore', 'America/New_York'][idx % 5]),
            deviceType: r.deviceType || (['desktop', 'desktop', 'mobile', 'mobile', 'tablet'][idx % 5]),
            browserLanguage: r.browserLanguage || 'en-US',
            submittedAt: new Date(r.submittedAt),
          })),
          subscriptions: (parsed.subscriptions || []).map((sub: EmailSubscription) => ({
            ...sub,
            createdAt: new Date(sub.createdAt),
          })),
          mediaAssets: (parsed.mediaAssets || []).map((a: MediaAsset) => ({
            ...a,
            uploadedAt: new Date(a.uploadedAt),
          })),
          verificationTokens: (parsed.verificationTokens || []).map((vt: VerificationToken) => ({
            ...vt,
            expires: new Date(vt.expires),
          })),
        };
        return this.inMemoryCache;
      } catch (err) {
        console.warn('Error reading db file in getDB:', err);
      }
    }

    if (!this.inMemoryCache) {
      return this.initDatabase();
    }
    return this.inMemoryCache;
  }

  // --- Users ---
  async getUsers(): Promise<User[]> {
    return this.getDB().users;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.getDB().users.find((u) => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    return this.getDB().users.find((u) => u.email?.toLowerCase() === normalized) || null;
  }

  async createUser(data: {
    name: string;
    email: string;
    password?: string;
    role?: 'superadmin' | 'creator' | 'respondent';
    emailVerified?: Date | null;
    demographicData?: Record<string, unknown>;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const db = this.getDB();
    const normalizedEmail = data.email.toLowerCase().trim();

    if (db.users.some((u) => u.email?.toLowerCase() === normalizedEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      email: normalizedEmail,
      emailVerified: data.emailVerified !== undefined ? data.emailVerified : null,
      image: null,
      password: data.password || 'password123',
      role: data.role || 'creator',
      demographicData: data.demographicData || {},
      createdAt: new Date(),
    };

    db.users.push(newUser);
    this.saveDatabase();

    return { success: true, user: newUser };
  }

  // --- Email Verification Tokens ---
  async createVerificationCode(email: string, expiresInMinutes: number = 15): Promise<string> {
    const db = this.getDB();
    const normalizedEmail = email.toLowerCase().trim();

    // Remove any existing pending tokens for this email
    db.verificationTokens = db.verificationTokens.filter(
      (vt) => vt.identifier.toLowerCase() !== normalizedEmail
    );

    // Generate secure 6-digit numeric OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    db.verificationTokens.push({
      identifier: normalizedEmail,
      token: code,
      expires,
    });

    this.saveDatabase();
    return code;
  }

  async verifyEmailCode(
    email: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    const db = this.getDB();
    const normalizedEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();

    const tokenEntry = db.verificationTokens.find(
      (vt) => vt.identifier.toLowerCase() === normalizedEmail
    );

    if (!tokenEntry) {
      return {
        success: false,
        error: 'No verification code found. Please request a new code.',
      };
    }

    if (new Date() > new Date(tokenEntry.expires)) {
      // Remove expired token
      db.verificationTokens = db.verificationTokens.filter(
        (vt) => vt.identifier.toLowerCase() !== normalizedEmail
      );
      this.saveDatabase();
      return {
        success: false,
        error: 'Verification code has expired. Please request a new code.',
      };
    }

    if (tokenEntry.token !== cleanCode) {
      return { success: false, error: 'Incorrect verification code. Please check and try again.' };
    }

    // Code is valid: remove token and mark user account verified
    db.verificationTokens = db.verificationTokens.filter(
      (vt) => vt.identifier.toLowerCase() !== normalizedEmail
    );

    const user = db.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (user) {
      user.emailVerified = new Date();
    }

    this.saveDatabase();
    return { success: true };
  }

  async setAccountVerified(email: string): Promise<boolean> {
    const db = this.getDB();
    const normalizedEmail = email.toLowerCase().trim();
    const user = db.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (user) {
      user.emailVerified = new Date();
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- Surveys ---
  async getSurveys(): Promise<Survey[]> {
    return this.getDB().surveys.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getActiveSurveys(): Promise<Survey[]> {
    const surveys = await this.getSurveys();
    return surveys.filter((s) => s.status === 'active');
  }

  async getSurveyById(id: string): Promise<Survey | null> {
    return this.getDB().surveys.find((s) => s.id === id) || null;
  }

  async getSurveysByCreator(creatorId: string): Promise<Survey[]> {
    return this.getDB()
      .surveys.filter((s) => s.creatorId === creatorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getActiveSurveyByCreator(creatorId: string): Promise<Survey | null> {
    return (
      this.getDB().surveys.find((s) => s.creatorId === creatorId && s.status === 'active') || null
    );
  }

  async createSurvey(data: {
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
  }): Promise<{ success: boolean; survey?: Survey; error?: string }> {
    const db = this.getDB();

    // Check if creator already has an active survey. If so, archive it to keep 1 active survey limit
    const activeSurvey = db.surveys.find(
      (s) => s.creatorId === data.creatorId && s.status === 'active'
    );
    if (activeSurvey) {
      activeSurvey.status = 'closed';
    }

    const surveyId = `survey_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSurvey: Survey = {
      id: surveyId,
      creatorId: data.creatorId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      status: 'active',
      resultsUnlockConfig: data.resultsUnlockConfig,
      createdAt: new Date(),
    };

    db.surveys.unshift(newSurvey);

    // Create Questions
    data.questions.forEach((q, idx) => {
      const qId = `q_${surveyId}_${idx + 1}`;
      const newQ: Question = {
        id: qId,
        surveyId,
        text: q.text.trim(),
        isDemographicFlag: q.isDemographicFlag,
        demographicType: q.demographicType || null,
        options: q.options.map((opt, optIdx) => ({
          id: opt.id || `opt_${qId}_${optIdx + 1}`,
          text: opt.text.trim(),
          nextQuestionId: opt.nextQuestionId || undefined,
        })),
        orderIndex: idx,
      };
      db.questions.push(newQ);
    });

    this.saveDatabase();
    return { success: true, survey: newSurvey };
  }

  async updateSurveyStatus(
    surveyId: string,
    status: 'draft' | 'active' | 'closed'
  ): Promise<{ success: boolean; error?: string }> {
    const db = this.getDB();
    const survey = db.surveys.find((s) => s.id === surveyId);
    if (!survey) return { success: false, error: 'Survey not found' };

    if (status === 'active') {
      // Archive any other active survey by this creator
      const existing = db.surveys.find(
        (s) => s.creatorId === survey.creatorId && s.status === 'active' && s.id !== surveyId
      );
      if (existing) {
        existing.status = 'closed';
      }
    }

    survey.status = status;
    this.saveDatabase();
    return { success: true };
  }

  async toggleSurveyResultsUnlock(
    surveyId: string,
    unlocked?: boolean
  ): Promise<{ success: boolean; isUnlocked?: boolean; error?: string }> {
    const db = this.getDB();
    const survey = db.surveys.find((s) => s.id === surveyId);
    if (!survey) return { success: false, error: 'Survey not found' };

    const newUnlocked =
      unlocked !== undefined ? unlocked : !survey.resultsUnlockConfig.unlocked;

    survey.resultsUnlockConfig = {
      ...survey.resultsUnlockConfig,
      unlocked: newUnlocked,
    };

    this.saveDatabase();
    return { success: true, isUnlocked: newUnlocked };
  }

  async deleteSurvey(surveyId: string): Promise<{ success: boolean; error?: string }> {
    const db = this.getDB();
    const beforeCount = db.surveys.length;
    db.surveys = db.surveys.filter((s) => s.id !== surveyId);
    db.questions = db.questions.filter((q) => q.surveyId !== surveyId);
    db.responses = db.responses.filter((r) => r.surveyId !== surveyId);
    db.subscriptions = db.subscriptions.filter((s) => s.surveyId !== surveyId);

    if (db.surveys.length === beforeCount) {
      return { success: false, error: 'Survey not found' };
    }

    this.saveDatabase();
    return { success: true };
  }

  // --- Questions ---
  async getQuestionsBySurvey(surveyId: string): Promise<Question[]> {
    return this.getDB()
      .questions.filter((q) => q.surveyId === surveyId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  // --- Responses & Deduplication ---
  async getResponsesBySurvey(surveyId: string): Promise<Response[]> {
    return this.getDB().responses.filter((r) => r.surveyId === surveyId);
  }

  async submitResponse(params: {
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
  }): Promise<{
    success: boolean;
    response?: Response;
    deduplication?: DeduplicationCheckResult;
    error?: string;
  }> {
    const db = this.getDB();

    // 1. Multi-factor deduplication check
    const dedup = checkDuplicateResponse(db.responses, {
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
        error: 'You have already submitted a response for this survey.',
      };
    }

    // 2. Insert new response with location and environment metadata
    const newResponse: Response = {
      id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

    db.responses.push(newResponse);

    // 3. Check threshold unlock status
    const survey = db.surveys.find((s) => s.id === params.surveyId);
    if (survey && survey.resultsUnlockConfig.type === 'threshold') {
      const count = db.responses.filter((r) => r.surveyId === params.surveyId).length;
      if (
        survey.resultsUnlockConfig.thresholdCount &&
        count >= survey.resultsUnlockConfig.thresholdCount
      ) {
        survey.resultsUnlockConfig.unlocked = true;
      }
    }

    this.saveDatabase();
    return { success: true, response: newResponse };
  }

  // --- Subscriptions ---
  async subscribeEmailAlert(
    surveyId: string,
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    const db = this.getDB();
    const normalized = email.toLowerCase().trim();

    const exists = db.subscriptions.some(
      (s) => s.surveyId === surveyId && s.email.toLowerCase() === normalized
    );

    if (!exists) {
      db.subscriptions.push({
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        surveyId,
        email: normalized,
        createdAt: new Date(),
      });
      this.saveDatabase();
    }

    return { success: true };
  }

  // --- Media Assets ---
  async getMediaAssets(): Promise<MediaAsset[]> {
    return this.getDB().mediaAssets.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async addMediaAsset(asset: {
    name: string;
    url: string;
    size: string;
  }): Promise<MediaAsset> {
    const db = this.getDB();
    const newAsset: MediaAsset = {
      id: `asset_${Date.now()}`,
      name: asset.name,
      url: asset.url,
      size: asset.size,
      uploadedAt: new Date(),
    };
    db.mediaAssets.unshift(newAsset);
    this.saveDatabase();
    return newAsset;
  }

  // --- Global Stats ---
  async getGlobalStats(): Promise<{
    totalUsers: number;
    totalSurveys: number;
    totalResponses: number;
    activeSurveysCount: number;
  }> {
    const db = this.getDB();
    return {
      totalUsers: db.users.length,
      totalSurveys: db.surveys.length,
      totalResponses: db.responses.length,
      activeSurveysCount: db.surveys.filter((s) => s.status === 'active').length,
    };
  }
}

export const surveyRepository = new SurveyRepository();
