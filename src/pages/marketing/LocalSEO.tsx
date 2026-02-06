/**
 * Local SEO Tracker Page
 *
 * Monitor Google Business Profile rankings and local SEO metrics
 */

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LocalSEOTracker } from '@/components/marketing/LocalSEOTracker';

export default function LocalSEOPage() {
  return (
    <MainLayout>
      <LocalSEOTracker />
    </MainLayout>
  );
}
