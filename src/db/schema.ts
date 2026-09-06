import { pgTable, text, timestamp, boolean, jsonb, integer, primaryKey } from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

// Users Table with Roles (superadmin, creator, respondent)
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  password: text('password'), // Optional hashed password for email/password auth
  role: text('role', { enum: ['superadmin', 'creator', 'respondent'] })
    .notNull()
    .default('respondent'),
  demographicData: jsonb('demographic_data').$type<{
    ageGroup?: string;
    gender?: string;
    country?: string;
    employment?: string;
    [key: string]: unknown;
  }>(),
  coinsBalance: integer('coins_balance').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Auth.js Accounts Table
export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

// Auth.js Sessions Table
export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// Auth.js Verification Tokens Table
export const verificationTokens = pgTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => [
    primaryKey({
      columns: [vt.identifier, vt.token],
    }),
  ]
);

// Surveys Table
export interface ResultsUnlockConfig {
  type: 'immediate' | 'threshold' | 'scheduled' | 'manual';
  thresholdCount?: number;
  unlockAt?: string; // ISO String
  unlocked?: boolean;
}

export interface PersonalityArchetype {
  id: string;
  title: string;
  description: string;
  badgeColor?: string;
  traits?: string[];
}

export const surveys = pgTable('surveys', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  creatorId: text('creator_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  surveyType: text('survey_type', { enum: ['poll', 'personality'] })
    .notNull()
    .default('poll'),
  visibility: text('visibility', { enum: ['public', 'respondents_only', 'private'] })
    .notNull()
    .default('public'),
  personalityArchetypes: jsonb('personality_archetypes')
    .$type<PersonalityArchetype[]>()
    .notNull()
    .default([]),
  status: text('status', { enum: ['draft', 'active', 'closed'] })
    .notNull()
    .default('draft'),
  coinsReward: integer('coins_reward').notNull().default(10),
  resultsUnlockConfig: jsonb('results_unlock_config')
    .$type<ResultsUnlockConfig>()
    .notNull()
    .default({ type: 'immediate', unlocked: true }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Question Option with Optional Dynamic Logic Jump & Personality Weights
export interface QuestionOption {
  id: string;
  text: string;
  nextQuestionId?: string; // ID of target question to jump to, or 'END_SURVEY'
  archetypeWeights?: Record<string, number>; // archetypeId -> points/weight
}

// Questions Table (Text-only + Demographic Flag + Logic Jump Options)
export const questions = pgTable('questions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  surveyId: text('survey_id')
    .notNull()
    .references(() => surveys.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  isDemographicFlag: boolean('is_demographic_flag').default(false).notNull(),
  demographicType: text('demographic_type'), // 'age' | 'gender' | 'country' | 'employment' | 'custom'
  options: jsonb('options').$type<QuestionOption[]>().notNull().default([]),
  orderIndex: integer('order_index').notNull().default(0),
});

// Responses Table
export const responses = pgTable('responses', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  surveyId: text('survey_id')
    .notNull()
    .references(() => surveys.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  answers: jsonb('answers')
    .$type<Record<string, string>>() // questionId -> optionId
    .notNull(),
  resultArchetypeId: text('result_archetype_id'),
  earnedCoins: integer('earned_coins').notNull().default(0),
  sessionCookie: text('session_cookie').notNull(),
  ipHash: text('ip_hash').notNull(),
  fingerprintHash: text('fingerprint_hash').notNull(),
  turnstileScore: text('turnstile_score').default('1.0'),
  country: text('country').default('US'),
  region: text('region'),
  city: text('city'),
  timezone: text('timezone').default('UTC'),
  deviceType: text('device_type').default('desktop'),
  browserLanguage: text('browser_language').default('en'),
  organicCohort: jsonb('organic_cohort').$type<{
    activityTier?: string;
    deviceClass?: string;
    geoRegion?: string;
    isReturning?: boolean;
    clusterId?: string;
  }>(),
  submittedAt: timestamp('submitted_at', { mode: 'date' }).defaultNow().notNull(),
});

// Cross-survey composite identity clusters
export const identityClusters = pgTable('identity_clusters', {
  clusterId: text('cluster_id').primaryKey(),
  primaryIpHash: text('primary_ip_hash').notNull(),
  fingerprintHashes: jsonb('fingerprint_hashes').$type<string[]>().notNull().default([]),
  sessionCookies: jsonb('session_cookies').$type<string[]>().notNull().default([]),
  surveyIds: jsonb('survey_ids').$type<string[]>().notNull().default([]),
  totalResponsesCount: integer('total_responses_count').notNull().default(1),
  firstSeenAt: timestamp('first_seen_at', { mode: 'date' }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { mode: 'date' }).defaultNow().notNull(),
});

// Coin Transactions Table (Ledger for {{coins}})
export const coinTransactions = pgTable('coin_transactions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  type: text('type', { enum: ['survey_completion', 'creator_milestone', 'bonus', 'daily_streak', 'perk_redemption'] }).notNull(),
  description: text('description'),
  surveyId: text('survey_id'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Response = typeof responses.$inferSelect;
export type NewResponse = typeof responses.$inferInsert;
export type IdentityCluster = typeof identityClusters.$inferSelect;
export type NewIdentityCluster = typeof identityClusters.$inferInsert;
export type CoinTransaction = typeof coinTransactions.$inferSelect;
export type NewCoinTransaction = typeof coinTransactions.$inferInsert;
