import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SurveyWorkspace } from '../../../../src/features/curb/survey/SurveyWorkspace';

// The curb-survey-v1 contract defines exactly one survey.
const SUPPORTED_SURVEY_IDS = new Set(['robertson-hall']);

export const metadata: Metadata = {
  title: 'Curb · Survey replay',
};

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!SUPPORTED_SURVEY_IDS.has(id)) notFound();
  return <SurveyWorkspace />;
}
