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

export const surveys = pgTable('surveys', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  creatorId: text('creator_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['draft', 'active', 'closed'] })
    .notNull()
    .default('draft'),
  resultsUnlockConfig: jsonb('results_unlock_config')
    .$type<ResultsUnlockConfig>()
    .notNull()
    .default({ type: 'immediate', unlocked: true }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Question Option with Optional Dynamic Logic Jump
export interface QuestionOption {
  id: string;
  text: string;
  nextQuestionId?: string; // ID of target question to jump to, or 'END_SURVEY'
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
  submittedAt: timestamp('submitted_at', { mode: 'date' }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Response = typeof responses.$inferSelect;
export type NewResponse = typeof responses.$inferInsert;
