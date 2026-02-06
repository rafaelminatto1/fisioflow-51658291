/**
 * Patient Journey Timelapse Page
 *
 * Full page for creating timelapse videos from patient evolution photos
 */

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { JourneyTimelapse } from '@/components/marketing/JourneyTimelapse';
import { useAuth } from '@/contexts/AuthContext';

export default function JourneyTimelapsePage() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Timelapse de Evolução</h1>
        <p className="text-muted-foreground mt-1">
          Crie vídeos timelapse automáticos com fotos do paciente
        </p>
      </div>

      <JourneyTimelapse clinicName={user?.clinicName || 'FisioFlow'} />
    </MainLayout>
  );
}
