import type { Metadata } from 'next';
import { InvestmentDemo } from '../../../src/features/curb/investment/InvestmentDemo';

export const metadata: Metadata = {
  title: 'Curb · Investment demo',
  description: 'Compare repair investments in an explicitly synthetic campus scenario.',
};

export default function InvestmentDemoPage() {
  return <InvestmentDemo />;
}
