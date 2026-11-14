import type { Metadata } from 'next';
import { TripPlanner } from '../../../src/features/curb/trips/TripPlanner';

export const metadata: Metadata = {
  title: 'Curb · Trip comparison',
};

export default function TripsPage() {
  return <TripPlanner />;
}
