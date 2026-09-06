'use server';

import { generateSurveyWithGemini, GeneratedSurveyResult } from '@/lib/gemini';

export async function generateSurveyWithAIAction(params: {
  prompt: string;
  surveyType: 'poll' | 'personality';
  customApiKey?: string | null;
}): Promise<{ success: boolean; data?: GeneratedSurveyResult; error?: string }> {
  try {
    const result = await generateSurveyWithGemini({
      prompt: params.prompt,
      surveyType: params.surveyType,
      apiKey: params.customApiKey,
    });
    return result;
  } catch (error) {
    console.error('generateSurveyWithAIAction error:', error);
    return { success: false, error: 'Failed to generate survey with AI.' };
  }
}
