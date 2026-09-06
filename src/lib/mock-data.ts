import { User, Survey, Question, Response } from '@/db/schema';

export const INITIAL_USERS: User[] = [
  {
    id: 'user_admin',
    name: 'Platform Admin',
    email: 'admin@surveydonkey.com',
    emailVerified: new Date(),
    image: null,
    password: 'password123',
    role: 'superadmin',
    demographicData: { ageGroup: '35-44', gender: 'Female', country: 'United States', employment: 'Executive' },
    coinsBalance: 250,
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'user_creator_1',
    name: 'Survey Creator',
    email: 'creator@surveydonkey.com',
    emailVerified: new Date(),
    image: null,
    password: 'password123',
    role: 'creator',
    demographicData: { ageGroup: '25-34', gender: 'Male', country: 'United Kingdom', employment: 'Software Engineer' },
    coinsBalance: 140,
    createdAt: new Date('2026-02-15'),
  },
  {
    id: 'user_respondent_1',
    name: 'Sample Respondent',
    email: 'respondent@surveydonkey.com',
    emailVerified: new Date(),
    image: null,
    password: 'password123',
    role: 'respondent',
    demographicData: { ageGroup: '25-34', gender: 'Female', country: 'United States', employment: 'Tech & Product' },
    coinsBalance: 60,
    createdAt: new Date('2026-03-10'),
  },
];

export const INITIAL_SURVEYS: Survey[] = [
  {
    id: 'survey_founder_archetype',
    creatorId: 'user_creator_1',
    title: 'What Kind of Startup Founder Are You?',
    description: 'Discover your core startup operating archetype: The Visionary Architect, The Relentless Hustler, The Product Artisan, or The Scale Mastermind.',
    surveyType: 'personality',
    visibility: 'public',
    status: 'active',
    coinsReward: 15,
    personalityArchetypes: [
      {
        id: 'arch_visionary',
        title: 'The Visionary Architect',
        description: 'You see 5 years into the future and rally world-class talent around audacious missions that seem impossible to others.',
        badgeColor: 'indigo',
        traits: ['Big Picture Thinking', 'High Risk Tolerance', 'Charismatic Storyteller'],
      },
      {
        id: 'arch_hustler',
        title: 'The Relentless Hustler',
        description: 'You sell before the product is built, turn rejections into closed deals, and move mountains with raw momentum.',
        badgeColor: 'amber',
        traits: ['Hyper Velocity', 'Sales Intuition', 'Unrelenting Grit'],
      },
      {
        id: 'arch_purist',
        title: 'The Product Artisan',
        description: 'Obsessed with delightful UX, elegant engineering craft, and solving deep user pain points that competitors miss.',
        badgeColor: 'emerald',
        traits: ['Craftsmanship', 'Empathy', 'Obsessive Quality'],
      },
      {
        id: 'arch_operator',
        title: 'The Scale Mastermind',
        description: 'You turn chaos into clockwork. Every funnel, unit metric, and organizational mechanism is engineered for repeatable compound growth.',
        badgeColor: 'blue',
        traits: ['Systems Architecture', 'Metrics-Driven', 'Operational Rigor'],
      },
    ],
    resultsUnlockConfig: {
      type: 'immediate',
      unlocked: true,
    },
    createdAt: new Date('2026-08-15'),
  },
  {
    id: 'survey_ai_2026',
    creatorId: 'user_creator_1',
    title: 'AI & The Future of Software Engineering (2026)',
    description: 'A minimalist consensus study on AI pair programming, dynamic tool use, and career sentiment across global developer cohorts.',
    surveyType: 'poll',
    visibility: 'public',
    status: 'active',
    coinsReward: 10,
    personalityArchetypes: [],
    resultsUnlockConfig: {
      type: 'threshold',
      thresholdCount: 150,
      unlocked: false,
    },
    createdAt: new Date('2026-07-20'),
  },
  {
    id: 'survey_remote_work',
    creatorId: 'user_creator_1',
    title: 'Global Remote Work & Compensation Consensus',
    description: 'Analyzing salary transparency, location-based pay adjustments, and dynamic asynchronous collaboration standards.',
    surveyType: 'poll',
    visibility: 'public',
    status: 'active',
    coinsReward: 10,
    personalityArchetypes: [],
    resultsUnlockConfig: {
      type: 'immediate',
      unlocked: true,
    },
    createdAt: new Date('2026-06-10'),
  },
  {
    id: 'survey_creator_economy',
    creatorId: 'user_creator_1',
    title: 'Monetization Models in the Creator Economy',
    description: 'Draft survey exploring creator subscriptions vs ad-driven models.',
    surveyType: 'poll',
    visibility: 'private',
    status: 'draft',
    coinsReward: 10,
    personalityArchetypes: [],
    resultsUnlockConfig: {
      type: 'manual',
      unlocked: false,
    },
    createdAt: new Date('2026-08-01'),
  },
];

export const INITIAL_QUESTIONS: Question[] = [
  // --- Personality Test: Startup Founder Archetype ---
  {
    id: 'q_fa_1',
    surveyId: 'survey_founder_archetype',
    text: 'When launching a new venture, what excites you the most?',
    isDemographicFlag: false,
    demographicType: null,
    orderIndex: 0,
    options: [
      {
        id: 'opt_fa_1_vis',
        text: 'Building an audacious 5-year vision that fundamentally shifts an entire industry',
        archetypeWeights: { arch_visionary: 3 },
      },
      {
        id: 'opt_fa_1_hus',
        text: 'Getting the first 10 paying customers immediately, even before the prototype is built',
        archetypeWeights: { arch_hustler: 3 },
      },
      {
        id: 'opt_fa_1_pur',
        text: 'Crafting a sublime, pixel-perfect user experience that makes users fall in love',
        archetypeWeights: { arch_purist: 3 },
      },
      {
        id: 'opt_fa_1_ops',
        text: 'Architecting scalable systems, predictable funnels, and unit economic flywheels',
        archetypeWeights: { arch_operator: 3 },
      },
    ],
  },
  {
    id: 'q_fa_2',
    surveyId: 'survey_founder_archetype',
    text: 'A competitor just raised $50M and cloned your core feature. What is your immediate reaction?',
    isDemographicFlag: false,
    demographicType: null,
    orderIndex: 1,
    options: [
      {
        id: 'opt_fa_2_vis',
        text: 'Ignore the noise and leapfrog them into our next radical technological frontier',
        archetypeWeights: { arch_visionary: 3 },
      },
      {
        id: 'opt_fa_2_hus',
        text: 'Out-hustle them on direct outbound sales and lock down our key customer accounts',
        archetypeWeights: { arch_hustler: 3 },
      },
      {
        id: 'opt_fa_2_pur',
        text: 'Double down on craft and user delight; customers will choose superior polish',
        archetypeWeights: { arch_purist: 3 },
      },
      {
        id: 'opt_fa_2_ops',
        text: 'Audit our retention cohorts and tighten customer acquisition cost margins',
        archetypeWeights: { arch_operator: 3 },
      },
    ],
  },
  {
    id: 'q_fa_3',
    surveyId: 'survey_founder_archetype',
    text: 'How do you naturally spend your free time when thinking about your company?',
    isDemographicFlag: false,
    demographicType: null,
    orderIndex: 2,
    options: [
      {
        id: 'opt_fa_3_vis',
        text: 'Whiteboarding 5-year industry shifts and philosophical architectural blueprints',
        archetypeWeights: { arch_visionary: 3 },
      },
      {
        id: 'opt_fa_3_hus',
        text: 'Poring over prospect lists, drafting cold emails, and finding distribution leverage',
        archetypeWeights: { arch_hustler: 3 },
      },
      {
        id: 'opt_fa_3_pur',
        text: 'Testing product edge cases, obsessing over micro-interactions and copy polish',
        archetypeWeights: { arch_purist: 3 },
      },
      {
        id: 'opt_fa_3_ops',
        text: 'Reviewing team sprint velocity, financial burn charts, and recruiting pipelines',
        archetypeWeights: { arch_operator: 3 },
      },
    ],
  },
  {
    id: 'q_fa_4',
    surveyId: 'survey_founder_archetype',
    text: 'What is your primary superpower when presenting to partners and investors?',
    isDemographicFlag: false,
    demographicType: null,
    orderIndex: 3,
    options: [
      {
        id: 'opt_fa_4_vis',
        text: 'Painting an irresistible picture of the future that inspires true belief',
        archetypeWeights: { arch_visionary: 3 },
      },
      {
        id: 'opt_fa_4_hus',
        text: 'Demonstrating unrelenting commercial hustle and customer velocity',
        archetypeWeights: { arch_hustler: 3 },
      },
      {
        id: 'opt_fa_4_pur',
        text: 'A product demo so intuitive, fast, and gorgeous that it sells itself',
        archetypeWeights: { arch_purist: 3 },
      },
      {
        id: 'opt_fa_4_ops',
        text: 'Presenting airtight unit economics, low churn, and capital efficiency',
        archetypeWeights: { arch_operator: 3 },
      },
    ],
  },
  // --- Survey 1: AI & Engineering ---
  {
    id: 'q_demo_age',
    surveyId: 'survey_ai_2026',
    text: 'What is your age bracket?',
    isDemographicFlag: true,
    demographicType: 'age',
    orderIndex: 0,
    options: [
      { id: 'opt_age_18', text: '18 - 24' },
      { id: 'opt_age_25', text: '25 - 34' },
      { id: 'opt_age_35', text: '35 - 44' },
      { id: 'opt_age_45', text: '45 - 54' },
      { id: 'opt_age_55', text: '55+' },
    ],
  },
  {
    id: 'q_demo_country',
    surveyId: 'survey_ai_2026',
    text: 'Which region best describes your primary location?',
    isDemographicFlag: true,
    demographicType: 'country',
    orderIndex: 1,
    options: [
      { id: 'opt_geo_na', text: 'North America' },
      { id: 'opt_geo_eu', text: 'Europe' },
      { id: 'opt_geo_ap', text: 'Asia-Pacific' },
      { id: 'opt_geo_latam', text: 'Latin America' },
      { id: 'opt_geo_me', text: 'Middle East & Africa' },
    ],
  },
  {
    id: 'q_ai_frequency',
    surveyId: 'survey_ai_2026',
    text: 'How frequently do you use AI coding assistants in your daily engineering workflow?',
    isDemographicFlag: false,
    demographicType: null,
    orderIndex: 2,
    options: [
      { id: 'opt_ai_daily', text: 'Daily (Integrated into IDE)', nextQuestionId: 'q_ai_impact' },
      { id: 'opt_ai_weekly', text: 'Weekly for specific tasks', nextQuestionId: 'q_ai_impact' },
      { id: 'opt_ai_rarely', text: 'Rarely / Experimenting', nextQuestionId: 'q_ai_hesitation' },
      { id: 'opt_ai_never', text: 'Never / Prohibited by policy', nextQuestionId: 'q_ai_hesitation' },
    ],
  },
  {
    id: 'q_ai_impact',
    surveyId: 'survey_ai_2026',
    text: 'What has been the primary impact of AI assistants on your development velocity?',
    isDemographicFlag: false,
    demographicType: null,
    orderIndex: 3,
    options: [
      { id: 'opt_imp_2x', text: 'Significant boost (>50% faster boilerplate & refactoring)' },
      { id: 'opt_imp_mod', text: 'Moderate boost (10-30% speedup)' },
      { id: 'opt_imp_neutral', text: 'Neutral (Time spent reviewing AI output balances speedups)' },
      { id: 'opt_imp_neg', text: 'Slower due to debugging hallucinated code' },
    ],
  },
  {
    id: 'q_ai_hesitation',
    surveyId: 'survey_ai_2026',
    text: 'What is your primary concern regarding autonomous AI software engineering?',
    isDemographicFlag: false,
    demographicType: null,
    orderIndex: 4,
    options: [
      { id: 'opt_hes_security', text: 'Code quality, security vulnerabilities, & license compliance' },
      { id: 'opt_hes_skills', text: 'Atrophy of foundational problem-solving skills for junior devs' },
      { id: 'opt_hes_job', text: 'Industry workforce compression and displacement' },
      { id: 'opt_hes_none', text: 'No major concerns; excited for human-AI pairing' },
    ],
  },

  // --- Survey 2: Remote Work ---
  {
    id: 'q_rw_demo_age',
    surveyId: 'survey_remote_work',
    text: 'Select your age cohort:',
    isDemographicFlag: true,
    demographicType: 'age',
    orderIndex: 0,
    options: [
      { id: 'opt_rw_age1', text: '18 - 29' },
      { id: 'opt_rw_age2', text: '30 - 44' },
      { id: 'opt_rw_age3', text: '45+' },
    ],
  },
  {
    id: 'q_rw_preference',
    surveyId: 'survey_remote_work',
    text: 'What is your ideal work model assumption?',
    isDemographicFlag: false,
    demographicType: null,
    orderIndex: 1,
    options: [
      { id: 'opt_rw_full_remote', text: '100% Fully Remote' },
      { id: 'opt_rw_hybrid', text: 'Hybrid (1-2 days in office)' },
      { id: 'opt_rw_onsite', text: 'Fully On-site' },
    ],
  },
  {
    id: 'q_rw_compensation',
    surveyId: 'survey_remote_work',
    text: 'Should compensation be adjusted based on local cost-of-living?',
    isDemographicFlag: false,
    demographicType: null,
    orderIndex: 2,
    options: [
      { id: 'opt_comp_equal', text: 'No: Equal pay for equal role value, regardless of location' },
      { id: 'opt_comp_tiered', text: 'Yes: Tiered compensation zones based on regional index' },
    ],
  },
];

// Helper generator for realistic responses demographic distribution
function generateMockResponses(): Response[] {
  const responses: Response[] = [];

  const ageOptions = ['opt_age_18', 'opt_age_25', 'opt_age_35', 'opt_age_45', 'opt_age_55'];
  const geoOptions = ['opt_geo_na', 'opt_geo_eu', 'opt_geo_ap', 'opt_geo_latam', 'opt_geo_me'];
  const freqOptions = ['opt_ai_daily', 'opt_ai_weekly', 'opt_ai_rarely', 'opt_ai_never'];
  const impactOptions = ['opt_imp_2x', 'opt_imp_mod', 'opt_imp_neutral', 'opt_imp_neg'];
  const hesitationOptions = ['opt_hes_security', 'opt_hes_skills', 'opt_hes_job', 'opt_hes_none'];

  const countryList = [
    { country: 'US', region: 'California', city: 'San Francisco', timezone: 'America/Los_Angeles' },
    { country: 'US', region: 'New York', city: 'New York City', timezone: 'America/New_York' },
    { country: 'GB', region: 'England', city: 'London', timezone: 'Europe/London' },
    { country: 'DE', region: 'Bavaria', city: 'Munich', timezone: 'Europe/Berlin' },
    { country: 'SG', region: 'Central Region', city: 'Singapore', timezone: 'Asia/Singapore' },
    { country: 'CA', region: 'Ontario', city: 'Toronto', timezone: 'America/Toronto' },
    { country: 'JP', region: 'Kanto', city: 'Tokyo', timezone: 'Asia/Tokyo' },
    { country: 'AU', region: 'New South Wales', city: 'Sydney', timezone: 'Australia/Sydney' },
  ];

  const devices: ('desktop' | 'mobile' | 'tablet')[] = ['desktop', 'desktop', 'desktop', 'mobile', 'mobile', 'tablet'];

  // Seed 128 responses for Survey 1
  for (let i = 1; i <= 128; i++) {
    const ageOpt = ageOptions[Math.floor((i * 3) % ageOptions.length)];
    const geoOpt = geoOptions[Math.floor((i * 7) % geoOptions.length)];
    const freqOpt = freqOptions[Math.floor((i * 2 + 1) % freqOptions.length)];
    const impactOpt = freqOpt === 'opt_ai_daily' || freqOpt === 'opt_ai_weekly'
      ? impactOptions[Math.floor((i * 5) % impactOptions.length)]
      : undefined;
    const hesitationOpt = freqOpt === 'opt_ai_rarely' || freqOpt === 'opt_ai_never'
      ? hesitationOptions[Math.floor((i * 4) % hesitationOptions.length)]
      : hesitationOptions[3];

    const geoData = countryList[i % countryList.length];
    const deviceType = devices[i % devices.length];

    const answers: Record<string, string> = {
      q_demo_age: ageOpt,
      q_demo_country: geoOpt,
      q_ai_frequency: freqOpt,
    };
    if (impactOpt) answers.q_ai_impact = impactOpt;
    if (hesitationOpt) answers.q_ai_hesitation = hesitationOpt;

    responses.push({
      id: `resp_ai_${i}`,
      surveyId: 'survey_ai_2026',
      userId: i % 5 === 0 ? 'user_respondent_1' : null,
      answers,
      resultArchetypeId: null,
      earnedCoins: 10,
      sessionCookie: `sd_sess_mock_${i}_token`,
      ipHash: `ip_hash_${(i * 1337) % 99999}`,
      fingerprintHash: `fp_hash_${(i * 8888) % 77777}`,
      turnstileScore: '1.0',
      country: geoData.country,
      region: geoData.region,
      city: geoData.city,
      timezone: geoData.timezone,
      deviceType: deviceType,
      browserLanguage: 'en-US',
      organicCohort: {
        activityTier: i % 4 === 0 ? 'power_respondent' : i % 2 === 0 ? 'engaged' : 'newcomer',
        deviceClass: deviceType,
        geoRegion: geoData.country,
        isReturning: i % 3 !== 0,
      },
      submittedAt: new Date(Date.now() - (128 - i) * 3600 * 1000),
    });
  }

  // Seed 42 responses for Survey 2
  for (let i = 1; i <= 42; i++) {
    const geoData = countryList[(i + 3) % countryList.length];
    const deviceType = devices[(i + 1) % devices.length];

    responses.push({
      id: `resp_rw_${i}`,
      surveyId: 'survey_remote_work',
      userId: null,
      answers: {
        q_rw_demo_age: i % 2 === 0 ? 'opt_rw_age1' : 'opt_rw_age2',
        q_rw_preference: i % 3 === 0 ? 'opt_rw_hybrid' : 'opt_rw_full_remote',
        q_rw_compensation: i % 4 === 0 ? 'opt_comp_tiered' : 'opt_comp_equal',
      },
      resultArchetypeId: null,
      earnedCoins: 10,
      sessionCookie: `sd_sess_rw_${i}`,
      ipHash: `ip_hash_rw_${i}`,
      fingerprintHash: `fp_hash_rw_${i}`,
      turnstileScore: '1.0',
      country: geoData.country,
      region: geoData.region,
      city: geoData.city,
      timezone: geoData.timezone,
      deviceType: deviceType,
      browserLanguage: 'en-US',
      organicCohort: {
        activityTier: i % 3 === 0 ? 'power_respondent' : 'engaged',
        deviceClass: deviceType,
        geoRegion: geoData.country,
        isReturning: true,
      },
      submittedAt: new Date(Date.now() - i * 7200 * 1000),
    });
  }

  // Seed 36 responses for Founder Personality Test
  const founderArchetypeList = ['arch_visionary', 'arch_hustler', 'arch_purist', 'arch_operator'];
  for (let i = 1; i <= 36; i++) {
    const geoData = countryList[(i + 1) % countryList.length];
    const deviceType = devices[i % devices.length];
    const winningArch = founderArchetypeList[i % 4];

    responses.push({
      id: `resp_fa_${i}`,
      surveyId: 'survey_founder_archetype',
      userId: i === 1 ? 'user_creator_1' : null,
      answers: {
        q_fa_1: `opt_fa_1_${winningArch.split('_')[1].substring(0, 3)}`,
        q_fa_2: `opt_fa_2_${winningArch.split('_')[1].substring(0, 3)}`,
        q_fa_3: `opt_fa_3_${winningArch.split('_')[1].substring(0, 3)}`,
        q_fa_4: `opt_fa_4_${winningArch.split('_')[1].substring(0, 3)}`,
      },
      resultArchetypeId: winningArch,
      earnedCoins: 15,
      sessionCookie: `sd_sess_fa_${i}`,
      ipHash: `ip_hash_fa_${i}`,
      fingerprintHash: `fp_hash_fa_${i}`,
      turnstileScore: '1.0',
      country: geoData.country,
      region: geoData.region,
      city: geoData.city,
      timezone: geoData.timezone,
      deviceType: deviceType,
      browserLanguage: 'en-US',
      organicCohort: {
        activityTier: i % 5 === 0 ? 'power_respondent' : 'engaged',
        deviceClass: deviceType,
        geoRegion: geoData.country,
        isReturning: i % 2 === 0,
      },
      submittedAt: new Date(Date.now() - (36 - i) * 1800 * 1000),
    });
  }

  return responses;
}

export const INITIAL_RESPONSES: Response[] = generateMockResponses();
