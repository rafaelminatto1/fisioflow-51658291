/**
 * Treatment Adherence Gamification Page
 *
 * Configure and manage the gamification system for patient treatment adherence
 */

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AdherenceGamification } from '@/components/marketing/AdherenceGamification';

export default function AdherenceGamificationPage() {
  return (
    <MainLayout>
      <AdherenceGamification />
    </MainLayout>
  );
}
