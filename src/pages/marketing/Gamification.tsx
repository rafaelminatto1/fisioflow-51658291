/**
 * Treatment Adherence Gamification Page
 *
 * Configure and manage the gamification system for patient treatment adherence
 */

import React from "react";
import { PageLayout, PageContainer } from "@/components/layout/PageLayout";
import { AdherenceGamification } from "@/components/marketing/AdherenceGamification";

export default function AdherenceGamificationPage() {
  return (
    <PageLayout>
      <PageContainer>
        <AdherenceGamification />
      </PageContainer>
    </PageLayout>
  );
}
