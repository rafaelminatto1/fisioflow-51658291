/**
 * Patient Journey Timelapse Page
 *
 * Full page for creating timelapse videos from patient evolution photos
 */

import React from "react";
import { PageLayout, PageContainer } from "@/components/layout/PageLayout";
import { JourneyTimelapse } from "@/components/marketing/JourneyTimelapse";
import { useAuth } from "@/contexts/AuthContext";

export default function JourneyTimelapsePage() {
  const { user } = useAuth();

  return (
    <PageLayout>
      <PageContainer>
        <PageHeader
          title="Timelapse de Evolução"
          subtitle="Crie vídeos timelapse automáticos com fotos do paciente"
        />
        <JourneyTimelapse clinicName={user?.clinicName || "FisioFlow"} />
      </PageContainer>
    </PageLayout>
  );
}
