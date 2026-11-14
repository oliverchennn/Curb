import type { Metadata } from 'next';
import { CurbScreen } from '../../src/features/curb/screen/CurbScreen';

export const metadata: Metadata = {
  title: 'Curb · Campus barriers',
};

export default function CurbPage() {
  return <CurbScreen />;
}
