/**
 * Myth vs Truth Generator Page
 *
 * Full page for creating "Mito vs Verdade" content for social media
 */

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MythVsTruthGenerator } from '@/components/marketing/MythVsTruthGenerator';

export default function MythVsTruthPage() {
  return (
    <MainLayout>
      <MythVsTruthGenerator />
    </MainLayout>
  );
}
