import { PersonalityArchetype } from '@/db/schema';

export interface GeneratedSurveyQuestion {
  text: string;
  isDemographicFlag: boolean;
  demographicType?: string;
  options: Array<{
    text: string;
    archetypeWeights?: Record<string, number>;
  }>;
}

export interface GeneratedSurveyResult {
  title: string;
  description: string;
  surveyType: 'poll' | 'personality';
  personalityArchetypes?: PersonalityArchetype[];
  questions: GeneratedSurveyQuestion[];
}

/**
 * Call Gemini API or use smart fallback to generate structured survey/quiz JSON.
 */
export async function generateSurveyWithGemini(params: {
  prompt: string;
  surveyType: 'poll' | 'personality';
  apiKey?: string | null;
}): Promise<{ success: boolean; data?: GeneratedSurveyResult; error?: string }> {
  const { prompt, surveyType, apiKey } = params;
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!prompt || !prompt.trim()) {
    return { success: false, error: 'Please enter a topic or description.' };
  }

  // If Gemini API Key is available, call the Gemini API
  if (key && key.trim()) {
    try {
      const systemInstruction =
        surveyType === 'personality'
          ? `You are a survey & personality quiz design expert. Create a complete, engaging Personality Test in JSON.
Output ONLY valid JSON with this exact structure:
{
  "title": "Title of the test",
  "description": "Engaging, direct summary",
  "surveyType": "personality",
  "personalityArchetypes": [
    {
      "id": "arch_1",
      "title": "Archetype Name",
      "description": "2-3 sentences explaining this archetype",
      "badgeColor": "indigo|amber|emerald|blue|purple|rose",
      "traits": ["Trait 1", "Trait 2", "Trait 3"]
    }
  ],
  "questions": [
    {
      "text": "Question text?",
      "isDemographicFlag": false,
      "options": [
        {
          "text": "Answer choice 1",
          "archetypeWeights": { "arch_1": 3 }
        }
      ]
    }
  ]
}
Include exactly 3 or 4 archetypes and 4 to 6 questions. Ensure each option assigns points to at least one archetype.`
          : `You are an opinion poll and survey design expert. Create a comprehensive, balanced Opinion Poll in JSON.
Output ONLY valid JSON with this exact structure:
{
  "title": "Title of the survey",
  "description": "Concise summary",
  "surveyType": "poll",
  "questions": [
    {
      "text": "Question text?",
      "isDemographicFlag": false,
      "options": [
        { "text": "Option A" },
        { "text": "Option B" },
        { "text": "Option C" },
        { "text": "Option D" }
      ]
    }
  ]
}
Include 1 initial demographic question (e.g. industry or age cohort) marked with isDemographicFlag: true, followed by 3 to 5 core opinion questions with 3-5 clear options each.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          key.trim()
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\nTopic / Request: ${prompt}` }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        const candidateText =
          result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (candidateText) {
          const parsed = JSON.parse(candidateText) as GeneratedSurveyResult;
          return { success: true, data: parsed };
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn('Gemini API returned non-OK status:', response.status, errJson);
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local template generator:', err);
    }
  }

  // Smart local generative fallback if API key is not configured or network error
  const fallback = generateSmartFallbackSurvey(prompt, surveyType);
  return { success: true, data: fallback };
}

/**
 * High-quality procedural fallback when Gemini API key is unset.
 */
function generateSmartFallbackSurvey(
  prompt: string,
  surveyType: 'poll' | 'personality'
): GeneratedSurveyResult {
  const cleanTitle = prompt.charAt(0).toUpperCase() + prompt.slice(1);

  if (surveyType === 'personality') {
    return {
      title: cleanTitle.includes('Test') || cleanTitle.includes('Quiz') ? cleanTitle : `${cleanTitle}: Archetype Assessment`,
      description: `Discover your primary behavioral and strategic archetype in relation to ${prompt.toLowerCase()}.`,
      surveyType: 'personality',
      personalityArchetypes: [
        {
          id: 'arch_strategist',
          title: 'The Pragmatic Strategist',
          description: 'Calculated, data-driven, and focused on sustainable long-term leverage.',
          badgeColor: 'blue',
          traits: ['Analytical', 'Systematic', 'High Discipline'],
        },
        {
          id: 'arch_innovator',
          title: 'The Radical Innovator',
          description: 'Unconstrained thinker driven by novel solutions and bold technological paradigms.',
          badgeColor: 'indigo',
          traits: ['Creative', 'Forward-Thinking', 'Adaptive'],
        },
        {
          id: 'arch_executor',
          title: 'The Velocity Executor',
          description: 'High energy, bias for immediate action, and relentless momentum.',
          badgeColor: 'amber',
          traits: ['Decisive', 'High Velocity', 'Action-Oriented'],
        },
        {
          id: 'arch_craftsman',
          title: 'The Detail Artisan',
          description: 'Deep dedication to uncompromising quality, craft, and refined execution.',
          badgeColor: 'emerald',
          traits: ['Perfectionist', 'Thoughtful', 'Quality-Obsessed'],
        },
      ],
      questions: [
        {
          text: `When approaching a critical obstacle in ${prompt.toLowerCase()}, what is your initial reflex?`,
          isDemographicFlag: false,
          options: [
            { text: 'Analyze root cause data and map out the scenario variables', archetypeWeights: { arch_strategist: 3 } },
            { text: 'Devise an unconventional solution that changes the game', archetypeWeights: { arch_innovator: 3 } },
            { text: 'Jump in immediately and test multiple rapid fixes in real time', archetypeWeights: { arch_executor: 3 } },
            { text: 'Carefully refine the underlying system until it is bulletproof', archetypeWeights: { arch_craftsman: 3 } },
          ],
        },
        {
          text: 'Which measure of success resonates most strongly with your values?',
          isDemographicFlag: false,
          options: [
            { text: 'Predictable, compounding growth and high efficiency metrics', archetypeWeights: { arch_strategist: 3 } },
            { text: 'Creating something truly novel that shifts industry standards', archetypeWeights: { arch_innovator: 3 } },
            { text: 'Rapid speed of delivery and outworking the competition', archetypeWeights: { arch_executor: 3 } },
            { text: 'Flawless aesthetic and operational craftsmanship', archetypeWeights: { arch_craftsman: 3 } },
          ],
        },
        {
          text: 'Under high pressure and tight deadlines, how does your style adapt?',
          isDemographicFlag: false,
          options: [
            { text: 'Prioritize the critical path and cut non-essential overhead', archetypeWeights: { arch_strategist: 3 } },
            { text: 'Reframe the problem to uncover hidden shortcuts or breakthroughs', archetypeWeights: { arch_innovator: 3 } },
            { text: 'Accelerate output cadence and rally the team with momentum', archetypeWeights: { arch_executor: 3 } },
            { text: 'Refuse to sacrifice core quality while focusing on essential details', archetypeWeights: { arch_craftsman: 3 } },
          ],
        },
        {
          text: 'What kind of collaborators do you work best with?',
          isDemographicFlag: false,
          options: [
            { text: 'Clear-headed analysts who value evidence and structure', archetypeWeights: { arch_strategist: 3 } },
            { text: 'Visionaries who aren’t afraid of unproven experiments', archetypeWeights: { arch_innovator: 3 } },
            { text: 'Tenacious builders who deliver results without hesitation', archetypeWeights: { arch_executor: 3 } },
            { text: 'Conscientious creators who appreciate deep mastery and care', archetypeWeights: { arch_craftsman: 3 } },
          ],
        },
      ],
    };
  }

  // Poll Fallback
  return {
    title: cleanTitle.includes('Survey') || cleanTitle.includes('Poll') ? cleanTitle : `${cleanTitle} Consensus Study`,
    description: `A community consensus poll measuring perspective, adoption, and expectations on ${prompt.toLowerCase()}.`,
    surveyType: 'poll',
    questions: [
      {
        text: 'What is your primary professional background or industry focus?',
        isDemographicFlag: true,
        demographicType: 'employment',
        options: [
          { text: 'Software Engineering & AI' },
          { text: 'Product Management & Design' },
          { text: 'Operations, Finance & Strategy' },
          { text: 'Marketing & Growth' },
          { text: 'Student / Independent Researcher' },
        ],
      },
      {
        text: `What is your current adoption or sentiment regarding ${prompt.toLowerCase()}?`,
        isDemographicFlag: false,
        options: [
          { text: 'Fully embraced in daily workflows / Highly positive' },
          { text: 'Actively evaluating with measured optimism' },
          { text: 'Skeptical / Waiting for further standardization' },
          { text: 'Not applicable or opposed' },
        ],
      },
      {
        text: `What represents the most significant opportunity in ${prompt.toLowerCase()} over the next 24 months?`,
        isDemographicFlag: false,
        options: [
          { text: 'Exponential velocity and productivity multipliers' },
          { text: 'Democratization and lowering barriers to entry' },
          { text: 'Creation of entirely new categories and business models' },
          { text: 'Cost reduction and operational automation' },
        ],
      },
      {
        text: `What is the primary bottleneck or concern holding back broader impact?`,
        isDemographicFlag: false,
        options: [
          { text: 'Quality, accuracy, or security guarantees' },
          { text: 'High costs or infrastructure complexity' },
          { text: 'Regulatory, legal, or ethical uncertainty' },
          { text: 'Cultural inertia and change management' },
        ],
      },
    ],
  };
}
