import type { Metadata } from 'next';
import Link from 'next/link';
import { CurbScreen } from '../../src/features/curb/screen/CurbScreen';

export const metadata: Metadata = {
  title: 'Curb · Campus barriers',
};

export default function CurbPage() {
  return <>
    <p><Link href="/curb/surveys/robertson-hall">Review the Robertson Hall survey →</Link></p>
    <p><Link href="/curb/trips">Plan a trip and compare one repair →</Link></p>
    <p><Link href="/curb/plans">View Robertson Hall repair priorities →</Link></p>
    <CurbScreen />
  </>;
}
