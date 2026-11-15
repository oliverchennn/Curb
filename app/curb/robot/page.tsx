import type { Metadata } from 'next';
import { RobotTab } from '../../../src/features/curb/robot/RobotTab';

export const metadata: Metadata = {
  title: 'Robot CAD · Curb',
  description:
    'Interactive concept CAD model of the Curb sidewalk-survey robot: auto-orbit, hover to highlight a component group, explode it, and inspect numbered parts. Concept model, not validated hardware.',
};

export default function RobotPage() {
  return <RobotTab />;
}
