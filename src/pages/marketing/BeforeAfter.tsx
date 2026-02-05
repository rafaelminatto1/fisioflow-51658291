/**
 * Before/After Wizard Page
 *
 * Full page for creating professional before/after comparison images
 */

import React from 'react';
import { BeforeAfterWizard } from '@/components/marketing/BeforeAfterWizard';
import { useAuth } from '@/contexts/AuthContext';

export default function BeforeAfterPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Criar Antes e Depois</h1>
        <p className="text-muted-foreground mt-1">
          Gere comparações profissionais para suas redes sociais
        </p>
      </div>

      <BeforeAfterWizard clinicName={user?.clinicName || 'FisioFlow'} />
    </div>
  );
}
