import type { Metadata } from 'next';
import Explorer from '../../../src/features/curb/explore/Explorer';
import { createAtlas } from '../../../src/features/curb/explore/data';

export const metadata: Metadata = { title: 'Route explorer · Curb', description: 'Inspect Princeton archive geometry and separate Robertson field evidence. Current traversal remains unknown.' };
export default function ExplorePage() { return <Explorer atlas={createAtlas()} />; }
