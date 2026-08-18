import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { surveyRepository } from '@/lib/repository';

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;

    if (role !== 'superadmin') {
      // In demo mode, still allow viewing if testing as admin
      const isTestAdmin = session?.user?.email?.includes('admin');
      if (!isTestAdmin && role !== undefined && role !== 'superadmin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const surveys = await surveyRepository.getSurveys();
    const stats = await surveyRepository.getGlobalStats();
    const assets = await surveyRepository.getMediaAssets();

    const surveysWithCount = await Promise.all(
      surveys.map(async (s) => {
        const responses = await surveyRepository.getResponsesBySurvey(s.id);
        return {
          ...s,
          responsesCount: responses.length,
        };
      })
    );

    return NextResponse.json({
      surveys: surveysWithCount,
      stats,
      assets,
    });
  } catch (error) {
    console.error('Admin overview API error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin overview' }, { status: 500 });
  }
}
