import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { surveyRepository } from '@/lib/repository';
import { checkResultsUnlockStatus } from '@/lib/results-unlock';

export async function GET() {
  try {
    const session = await auth();
    const creatorId = session?.user?.id || 'user_creator_1';

    const surveys = await surveyRepository.getSurveysByCreator(creatorId);

    const surveysWithStats = await Promise.all(
      surveys.map(async (survey) => {
        const questions = await surveyRepository.getQuestionsBySurvey(survey.id);
        const responses = await surveyRepository.getResponsesBySurvey(survey.id);
        const unlockStatus = checkResultsUnlockStatus(
          survey.resultsUnlockConfig,
          responses.length
        );

        return {
          ...survey,
          questionsCount: questions.length,
          responsesCount: responses.length,
          unlockStatus,
        };
      })
    );

    return NextResponse.json({ surveys: surveysWithStats });
  } catch (error) {
    console.error('Error fetching creator surveys:', error);
    return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 });
  }
}
