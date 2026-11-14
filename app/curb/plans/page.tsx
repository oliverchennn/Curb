import type { Metadata } from 'next';
import { PlanPlanner } from '../../../src/features/curb/plans/PlanPlanner';

export const metadata: Metadata = {
  title: 'Curb · Repair plan comparison',
};

export default function PlansPage() {
  return <PlanPlanner />;
}
