import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { Shield, Key, Download, FileCheck } from "lucide-react";
import { MFASetupPanel } from "./MFASetupPanel";
import { DataExportPanel } from "./DataExportPanel";
import { LGPDConsentModal } from "./LGPDConsentModal";
import { useState } from "react";
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { useLGPDConsents } from "@/hooks/useLGPDConsents";
import { Badge } from '@/components/shared/ui/badge';

export function SecurityDashboard() {
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const { consents } = useLGPDConsents();

  const activeConsents = consents?.filter(c => c.granted).length || 0;
  const totalConsents = 4;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Segurança e Privacidade
        </h2>
        <p className="text-muted-foreground mt-1">
          Gerencie suas configurações de segurança e privacidade de dados
        </p>
      </div>

      <Tabs defaultValue="mfa" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mfa" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            MFA
          </TabsTrigger>
          <TabsTrigger value="lgpd" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            LGPD
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mfa">
          <MFASetupPanel />
        </TabsContent>

        <TabsContent value="lgpd">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Consentimentos LGPD
              </CardTitle>
              <CardDescription>
                Gerencie suas autorizações de uso de dados pessoais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Status dos Consentimentos</p>
                  <p className="text-xs text-muted-foreground">
                    {activeConsents} de {totalConsents} consentimentos ativos
                  </p>
                </div>
                <Badge variant={activeConsents >= 2 ? "default" : "secondary"}>
                  {activeConsents >= 2 ? "Completo" : "Pendente"}
                </Badge>
              </div>

              <Button onClick={() => setConsentModalOpen(true)} className="w-full">
                <FileCheck className="h-4 w-4 mr-2" />
                Gerenciar Consentimentos
              </Button>
            </CardContent>
          </Card>

          <LGPDConsentModal open={consentModalOpen} onOpenChange={setConsentModalOpen} />
        </TabsContent>

        <TabsContent value="export">
          <DataExportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
