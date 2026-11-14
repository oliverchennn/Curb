import type { Metadata } from 'next';
import { CollectionDemo } from '../../../src/features/curb/collection/CollectionDemo';

export const metadata: Metadata = {
  title: 'Collection concept · Curb',
  description: 'An illustrative camera-carrying robot and the path from footage to reviewed repair planning.',
};

export default function CollectionPage() {
  return <CollectionDemo />;
}
