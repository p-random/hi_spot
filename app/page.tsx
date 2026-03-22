'use client';

import dynamic from 'next/dynamic';

const CampusMap = dynamic(() => import('../components/CampusMap'), { ssr: false });

export default function Page() {
  return <CampusMap />;
}
