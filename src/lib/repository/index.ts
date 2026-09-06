import fs from 'fs';
import path from 'path';
import {
  User,
  Survey,
  Question,
  Response,
  ResultsUnlockConfig,
  PersonalityArchetype,
  IdentityCluster,
  CoinTransaction,
} from '@/db/schema';
import {
  INITIAL_USERS,
  INITIAL_SURVEYS,
  INITIAL_QUESTIONS,
  INITIAL_RESPONSES,
} from '../mock-data';
import { checkDuplicateResponse, DeduplicationCheckParams, DeduplicationCheckResult } from '../deduplication';
import { calculatePersonalityOutcome } from '../survey-engine';
import { checkResultsUnlockStatus } from '../results-unlock';

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
  identityClusters: IdentityCluster[];
  coinTransactions: CoinTransaction[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'surveydonkey-db.json');

class SurveyRepository {
  private inMemoryCache: DatabaseSchema | null = null;
  private lastLoadedMtime: number = 0;

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
        try {
          this.lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
        } catch {
          this.lastLoadedMtime = Date.now();
        }
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Revive date objects
        const existingSurveyIds = new Set((parsed.surveys || []).map((s: any) => s.id));
        const mergedSurveys = [
          ...(parsed.surveys || []),
          ...INITIAL_SURVEYS.filter((s) => !existingSurveyIds.has(s.id)),
        ];

        const existingQuestionIds = new Set((parsed.questions || []).map((q: any) => q.id));
        const mergedQuestions = [
          ...(parsed.questions || []),
          ...INITIAL_QUESTIONS.filter((q) => !existingQuestionIds.has(q.id)),
        ];

        const existingResponseIds = new Set((parsed.responses || []).map((r: any) => r.id));
        const mergedResponses = [
          ...(parsed.responses || []),
          ...INITIAL_RESPONSES.filter((r) => !existingResponseIds.has(r.id)),
        ];

        this.inMemoryCache = {
          users: (parsed.users || INITIAL_USERS).map((u: User) => ({
            ...u,
            coinsBalance: u.coinsBalance ?? 0,
            createdAt: new Date(u.createdAt),
            emailVerified: u.emailVerified ? new Date(u.emailVerified) : null,
          })),
          surveys: mergedSurveys.map((s: Survey) => ({
            ...s,
            surveyType: s.surveyType || 'poll',
            visibility: s.visibility || 'public',
            personalityArchetypes: s.personalityArchetypes || [],
            coinsReward: s.coinsReward ?? 10,
            createdAt: new Date(s.createdAt),
          })),
          questions: mergedQuestions,
          responses: mergedResponses.map((r: Response, idx: number) => ({
            ...r,
            resultArchetypeId: r.resultArchetypeId || null,
            earnedCoins: r.earnedCoins ?? 0,
            organicCohort: r.organicCohort || null,
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
          identityClusters: (parsed.identityClusters || []).map((ic: IdentityCluster) => ({
            ...ic,
            firstSeenAt: new Date(ic.firstSeenAt),
            lastSeenAt: new Date(ic.lastSeenAt),
          })),
          coinTransactions: (parsed.coinTransactions || []).map((ct: CoinTransaction) => ({
            ...ct,
            createdAt: new Date(ct.createdAt),
          })),
        };
        this.saveDatabase();
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
      identityClusters: [],
      coinTransactions: [],
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
      const tmpFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.inMemoryCache, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
      try {
        this.lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
      } catch {
        this.lastLoadedMtime = Date.now();
      }
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  private getDB(): DatabaseSchema {
    // If memory cache exists and file hasn't changed on disk, return cache immediately
    if (this.inMemoryCache && fs.existsSync(DB_FILE)) {
      try {
        const stat = fs.statSync(DB_FILE);
        if (stat.mtimeMs <= this.lastLoadedMtime) {
          return this.inMemoryCache;
        }
      } catch {
        return this.inMemoryCache;
      }
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const stat = fs.statSync(DB_FILE);
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.lastLoadedMtime = stat.mtimeMs;
        this.inMemoryCache = {
          users: (parsed.users || INITIAL_USERS).map((u: User) => ({
            ...u,
            coinsBalance: u.coinsBalance ?? 0,
            createdAt: new Date(u.createdAt),
            emailVerified: u.emailVerified ? new Date(u.emailVerified) : null,
          })),
          surveys: (parsed.surveys || INITIAL_SURVEYS).map((s: Survey) => ({
            ...s,
            surveyType: s.surveyType || 'poll',
            visibility: s.visibility || 'public',
            personalityArchetypes: s.personalityArchetypes || [],
            coinsReward: s.coinsReward ?? 10,
            createdAt: new Date(s.createdAt),
          })),
          questions: parsed.questions || INITIAL_QUESTIONS,
          responses: (parsed.responses || INITIAL_RESPONSES).map((r: Response, idx: number) => ({
            ...r,
            resultArchetypeId: r.resultArchetypeId || null,
            earnedCoins: r.earnedCoins ?? 0,
            organicCohort: r.organicCohort || null,
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
          identityClusters: (parsed.identityClusters || []).map((ic: IdentityCluster) => ({
            ...ic,
            firstSeenAt: new Date(ic.firstSeenAt),
            lastSeenAt: new Date(ic.lastSeenAt),
          })),
          coinTransactions: (parsed.coinTransactions || []).map((ct: CoinTransaction) => ({
            ...ct,
            createdAt: new Date(ct.createdAt),
          })),
        };
        return this.inMemoryCache;
      } catch (err) {
        console.warn('Error reading db file in getDB:', err);
        if (this.inMemoryCache) {
          return this.inMemoryCache;
        }
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
      coinsBalance: 50,
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
    return surveys.filter((s) => s.status === 'active' && s.visibility !== 'private');
  }

  async getHotSurveys(
    tab: 'hot' | 'newest' | 'personality' | 'poll' = 'hot',
    searchQuery?: string
  ): Promise<
    Array<
      Survey & {
        responsesCount: number;
        questionsCount: number;
        unlockStatus: any;
        isHot?: boolean;
        score: number;
      }
    >
  > {
    const db = this.getDB();
    const activeSurveys = db.surveys.filter(
      (s) => s.status === 'active' && s.visibility !== 'private'
    );

    const now = Date.now();
    const twoDaysAgo = now - 48 * 60 * 60 * 1000;

    let items = activeSurveys.map((survey) => {
      const surveyResponses = db.responses.filter((r) => r.surveyId === survey.id);
      const surveyQuestions = db.questions.filter((q) => q.surveyId === survey.id);
      const recentResponsesCount = surveyResponses.filter(
        (r) => new Date(r.submittedAt).getTime() >= twoDaysAgo
      ).length;

      // Scoring formula: recent velocity * 3 + total count
      const score = recentResponsesCount * 3 + surveyResponses.length * 1;
      const unlockStatus = checkResultsUnlockStatus(
        survey.resultsUnlockConfig,
        surveyResponses.length
      );

      return {
        ...survey,
        responsesCount: surveyResponses.length,
        questionsCount: surveyQuestions.length,
        unlockStatus,
        score,
        isHot: score >= 10 || recentResponsesCount >= 5,
      };
    });

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }

    if (tab === 'personality') {
      items = items.filter((s) => s.surveyType === 'personality');
      items.sort((a, b) => b.score - a.score);
    } else if (tab === 'poll') {
      items = items.filter((s) => s.surveyType === 'poll');
      items.sort((a, b) => b.score - a.score);
    } else if (tab === 'newest') {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // 'hot'
      items.sort((a, b) => b.score - a.score);
    }

    return items;
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
    surveyType?: 'poll' | 'personality';
    visibility?: 'public' | 'respondents_only' | 'private';
    personalityArchetypes?: PersonalityArchetype[];
    coinsReward?: number;
    resultsUnlockConfig: ResultsUnlockConfig;
    questions: Array<{
      text: string;
      isDemographicFlag: boolean;
      demographicType?: string;
      options: Array<{
        id: string;
        text: string;
        nextQuestionId?: string;
        archetypeWeights?: Record<string, number>;
      }>;
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
      surveyType: data.surveyType || 'poll',
      visibility: data.visibility || 'public',
      personalityArchetypes: data.personalityArchetypes || [],
      coinsReward: data.coinsReward ?? 10,
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
          archetypeWeights: opt.archetypeWeights || undefined,
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

  // --- Responses, Deduplication & Identity Clustering ---
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
    resultArchetypeId?: string | null;
  }): Promise<{
    success: boolean;
    response?: Response;
    deduplication?: DeduplicationCheckResult;
    earnedCoins?: number;
    resultArchetypeId?: string | null;
    error?: string;
  }> {
    const db = this.getDB();

    const survey = db.surveys.find((s) => s.id === params.surveyId);
    if (!survey) {
      return { success: false, error: 'Survey not found' };
    }

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

    // 2. Identity Clustering (cross-survey device and organic identification)
    let matchedCluster = db.identityClusters.find(
      (c) =>
        c.primaryIpHash === params.ipHash ||
        c.fingerprintHashes.includes(params.fingerprintHash) ||
        c.sessionCookies.includes(params.sessionCookie)
    );

    if (matchedCluster) {
      if (!matchedCluster.fingerprintHashes.includes(params.fingerprintHash)) {
        matchedCluster.fingerprintHashes.push(params.fingerprintHash);
      }
      if (!matchedCluster.sessionCookies.includes(params.sessionCookie)) {
        matchedCluster.sessionCookies.push(params.sessionCookie);
      }
      if (!matchedCluster.surveyIds.includes(params.surveyId)) {
        matchedCluster.surveyIds.push(params.surveyId);
      }
      matchedCluster.totalResponsesCount += 1;
      matchedCluster.lastSeenAt = new Date();
    } else {
      matchedCluster = {
        clusterId: `cluster_${Math.random().toString(36).substring(2, 9)}`,
        primaryIpHash: params.ipHash,
        fingerprintHashes: [params.fingerprintHash],
        sessionCookies: [params.sessionCookie],
        surveyIds: [params.surveyId],
        totalResponsesCount: 1,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };
      db.identityClusters.push(matchedCluster);
    }

    const totalClusterResponses = matchedCluster.totalResponsesCount;
    const activityTier =
      totalClusterResponses <= 1
        ? 'newcomer'
        : totalClusterResponses <= 4
        ? 'engaged'
        : 'power_respondent';

    const organicCohort = {
      activityTier,
      deviceClass: params.deviceType || 'desktop',
      geoRegion: params.country || 'US',
      isReturning: totalClusterResponses > 1,
      clusterId: matchedCluster.clusterId,
    };

    // 3. Personality test outcome calculation if personality test
    let resolvedArchetypeId = params.resultArchetypeId || null;
    if (
      !resolvedArchetypeId &&
      survey.surveyType === 'personality' &&
      survey.personalityArchetypes?.length > 0
    ) {
      const questions = db.questions.filter((q) => q.surveyId === params.surveyId);
      const outcome = calculatePersonalityOutcome(
        questions,
        params.answers,
        survey.personalityArchetypes
      );
      resolvedArchetypeId = outcome.winningArchetype?.id || null;
    }

    // 4. Insert new response with location and environment metadata
    const earnedCoins = survey.coinsReward || 10;
    const newResponse: Response = {
      id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      surveyId: params.surveyId,
      userId: params.userId || null,
      answers: params.answers,
      resultArchetypeId: resolvedArchetypeId,
      earnedCoins,
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
      organicCohort,
      submittedAt: new Date(),
    };

    db.responses.push(newResponse);

    // 5. Coin Awarding for authenticated respondent
    if (params.userId) {
      const user = db.users.find((u) => u.id === params.userId);
      if (user) {
        user.coinsBalance = (user.coinsBalance || 0) + earnedCoins;
        db.coinTransactions.push({
          id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: user.id,
          amount: earnedCoins,
          type: 'survey_completion',
          description: `Completed survey: ${survey.title}`,
          surveyId: survey.id,
          createdAt: new Date(),
        });
      }
    }

    // 6. Creator Milestone Check (Reward creator every 10 responses on this survey)
    const surveyResponsesCount = db.responses.filter((r) => r.surveyId === params.surveyId).length;
    if (surveyResponsesCount % 10 === 0) {
      const creator = db.users.find((u) => u.id === survey.creatorId);
      if (creator) {
        const milestoneReward = 25;
        creator.coinsBalance = (creator.coinsBalance || 0) + milestoneReward;
        db.coinTransactions.push({
          id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: creator.id,
          amount: milestoneReward,
          type: 'creator_milestone',
          description: `Creator milestone: ${surveyResponsesCount} responses on "${survey.title}"`,
          surveyId: survey.id,
          createdAt: new Date(),
        });
      }
    }

    // 7. Check threshold unlock status
    if (survey.resultsUnlockConfig.type === 'threshold') {
      if (
        survey.resultsUnlockConfig.thresholdCount &&
        surveyResponsesCount >= survey.resultsUnlockConfig.thresholdCount
      ) {
        survey.resultsUnlockConfig.unlocked = true;
      }
    }

    this.saveDatabase();
    return {
      success: true,
      response: newResponse,
      earnedCoins,
      resultArchetypeId: resolvedArchetypeId,
    };
  }

  // --- {{coins}} & Ledger ---
  async getUserCoins(
    userId: string
  ): Promise<{ balance: number; transactions: CoinTransaction[]; canClaimDaily: boolean }> {
    const db = this.getDB();
    const user = db.users.find((u) => u.id === userId);
    const balance = user ? user.coinsBalance || 0 : 0;
    const transactions = db.coinTransactions
      .filter((tx) => tx.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    // Check if user claimed daily streak within last 24h
    const lastDaily = transactions.find((tx) => tx.type === 'daily_streak');
    const canClaimDaily = !lastDaily || (Date.now() - new Date(lastDaily.createdAt).getTime() > 24 * 60 * 60 * 1000);

    return { balance, transactions, canClaimDaily };
  }

  async awardCoins(
    userId: string,
    amount: number,
    type: 'survey_completion' | 'creator_milestone' | 'bonus' | 'daily_streak' | 'perk_redemption',
    description: string,
    surveyId?: string
  ): Promise<number> {
    const db = this.getDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return 0;

    user.coinsBalance = Math.max(0, (user.coinsBalance || 0) + amount);
    db.coinTransactions.push({
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      amount,
      type,
      description,
      surveyId: surveyId || null,
      createdAt: new Date(),
    });
    this.saveDatabase();
    return user.coinsBalance;
  }

  async claimDailyBonus(userId: string): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const { canClaimDaily } = await this.getUserCoins(userId);
    if (!canClaimDaily) {
      return { success: false, newBalance: 0, error: 'Daily streak bonus already claimed for today. Come back tomorrow!' };
    }
    const bonusAmount = 10;
    const newBalance = await this.awardCoins(
      userId,
      bonusAmount,
      'daily_streak',
      'Daily Participation & Streak Reward (+10 {{coins}})'
    );
    return { success: true, newBalance };
  }

  async redeemPerk(
    userId: string,
    perkCost: number,
    perkTitle: string,
    surveyId?: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const db = this.getDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { success: false, newBalance: 0, error: 'User not found' };

    if ((user.coinsBalance || 0) < perkCost) {
      return { success: false, newBalance: user.coinsBalance || 0, error: `Insufficient {{coins}}. You need ${perkCost} {{coins}} for this perk.` };
    }

    const newBalance = await this.awardCoins(
      userId,
      -perkCost,
      'perk_redemption',
      `Redeemed Perk: ${perkTitle}`,
      surveyId
    );
    return { success: true, newBalance };
  }

  // --- Cross-Survey & Personality Insights ---
  async getCrossSurveyStats(surveyId: string): Promise<{
    totalRespondents: number;
    returningRespondentsPercent: number;
    powerRespondentsPercent: number;
  }> {
    const db = this.getDB();
    const surveyResponses = db.responses.filter((r) => r.surveyId === surveyId);
    const total = surveyResponses.length;
    if (total === 0) {
      return {
        totalRespondents: 0,
        returningRespondentsPercent: 0,
        powerRespondentsPercent: 0,
      };
    }

    let returningCount = 0;
    let powerCount = 0;

    surveyResponses.forEach((r) => {
      const cohort = r.organicCohort as any;
      if (cohort?.isReturning) returningCount++;
      if (cohort?.activityTier === 'power_respondent') powerCount++;
    });

    return {
      totalRespondents: total,
      returningRespondentsPercent: Math.round((returningCount / total) * 100),
      powerRespondentsPercent: Math.round((powerCount / total) * 100),
    };
  }

  async getPersonalityDistribution(
    surveyId: string
  ): Promise<
    Array<{
      archetypeId: string;
      title: string;
      description: string;
      badgeColor: string;
      count: number;
      percentage: number;
    }>
  > {
    const db = this.getDB();
    const survey = db.surveys.find((s) => s.id === surveyId);
    if (!survey || survey.surveyType !== 'personality' || !survey.personalityArchetypes) {
      return [];
    }

    const responses = db.responses.filter((r) => r.surveyId === surveyId);
    const total = responses.length;

    const counts: Record<string, number> = {};
    survey.personalityArchetypes.forEach((arch) => {
      counts[arch.id] = 0;
    });

    responses.forEach((r) => {
      if (r.resultArchetypeId && counts[r.resultArchetypeId] !== undefined) {
        counts[r.resultArchetypeId]++;
      }
    });

    return survey.personalityArchetypes.map((arch) => {
      const count = counts[arch.id] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        archetypeId: arch.id,
        title: arch.title,
        description: arch.description,
        badgeColor: arch.badgeColor || 'blue',
        count,
        percentage,
      };
    });
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
    totalCoinsInCirculation: number;
    identityClustersCount: number;
    personalityCount: number;
    pollCount: number;
  }> {
    const db = this.getDB();
    return {
      totalUsers: db.users.length,
      totalSurveys: db.surveys.length,
      totalResponses: db.responses.length,
      activeSurveysCount: db.surveys.filter((s) => s.status === 'active').length,
      totalCoinsInCirculation: db.users.reduce((acc, u) => acc + (u.coinsBalance || 0), 0),
      identityClustersCount: (db.identityClusters || []).length,
      personalityCount: db.surveys.filter((s) => s.surveyType === 'personality').length,
      pollCount: db.surveys.filter((s) => s.surveyType !== 'personality').length,
    };
  }
}

export const surveyRepository = new SurveyRepository();
