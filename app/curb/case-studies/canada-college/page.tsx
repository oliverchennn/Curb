import type { Metadata } from 'next';
import { CanadaCaseReadiness } from '../../../../src/features/curb/case-study/CanadaCaseReadiness';

export const metadata: Metadata = {
  title: 'Curb · Cañada College case study',
  description: 'Browse the 2020 Cañada College curb-ramp inventory and the evidence needed for a route comparison.',
};

export default function CanadaCollegePage() {
  return <CanadaCaseReadiness />;
}
