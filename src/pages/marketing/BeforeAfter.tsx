/**
 * Before/After Wizard Page
 *
 * Full page for creating professional before/after comparison images
 */

import React from "react";
import { PageLayout, PageContainer } from "@/components/layout/PageLayout";
import { BeforeAfterWizard } from "@/components/marketing/BeforeAfterWizard";
import { useAuth } from "@/contexts/AuthContext";

export default function BeforeAfterPage() {
  const { user } = useAuth();

  return (
    <PageLayout>
      <PageContainer>
        <PageHeader
          title="Criar Antes e Depois"
          subtitle="Gere comparações profissionais para suas redes sociais"
        />
        <BeforeAfterWizard clinicName={user?.clinicName || "FisioFlow"} />
      </PageContainer>
    </PageLayout>
  );
}
