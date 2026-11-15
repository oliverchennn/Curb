import type { Metadata } from 'next';
import { RepairPriorities } from '../../../src/features/curb/priorities/RepairPriorities';

export const metadata: Metadata = {
  title: 'Curb · Repair priorities',
};

export default function PlansPage() {
  return <RepairPriorities />;
}
