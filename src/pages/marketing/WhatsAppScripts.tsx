/**
 * WhatsApp Scripts Generator Page
 *
 * Full page for creating WhatsApp message templates
 */

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { WhatsAppScriptGenerator } from '@/components/marketing/WhatsAppScriptGenerator';

export default function WhatsAppScriptsPage() {
  return (
    <MainLayout>
      <WhatsAppScriptGenerator />
    </MainLayout>
  );
}
