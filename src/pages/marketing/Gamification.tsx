/**
 * Treatment Adherence Gamification Page
 *
 * Configure and manage the gamification system for patient treatment adherence
 */

import React from 'react';
import { AdherenceGamification } from '@/components/marketing/AdherenceGamification';

export default function AdherenceGamificationPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AdherenceGamification />
    </div>
  );
}
