/**
 * Movement Lab Page - Google AI Suite (Server-Side with Gemini 1.5 Pro)
 *
 * Funcionalidades:
 * - Upload de vídeo para análise na nuvem (Cloud Functions + Vertex AI)
 * - Feedback biomecânico automático
 * - Contagem de repetições e validação de exercício
 */

import React, { useState } from "react";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { ServerSideVideoAnalyzer } from "@/components/analysis/video/ServerSideVideoAnalyzer";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanFace, History } from "lucide-react";

export default function MovementLabPage() {
  const [activeTab, setActiveTab] = useState("analysis");

  return (
    <PageLayout>
      <PageContainer>
        <PageHeader title="Laboratório de Movimento (Beta)" />
        <div className="space-y-6">
          {/* Header */}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="analysis">Nova Análise</TabsTrigger>
              <TabsTrigger value="history" disabled>
                Histórico (Em breve)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="mt-6">
              <ServerSideVideoAnalyzer
                onAnalysisComplete={(result) => console.log("Analysis complete:", result)}
              />
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>O histórico de análises estará disponível em breve.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
