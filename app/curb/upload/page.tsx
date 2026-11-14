import type { Metadata } from 'next';
import { SurveyDemoEntry } from '../../../src/features/curb/survey/SurveyDemoEntry';

export const metadata: Metadata = { title: 'Curb · Start a survey' };

export default function UploadPage() {
  return <SurveyDemoEntry />;
}
