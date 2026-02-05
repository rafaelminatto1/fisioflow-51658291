/**
 * WhatsApp Scripts Generator Page
 *
 * Full page for creating WhatsApp message templates
 */

import React from 'react';
import { WhatsAppScriptGenerator } from '@/components/marketing/WhatsAppScriptGenerator';

export default function WhatsAppScriptsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <WhatsAppScriptGenerator />
    </div>
  );
}
