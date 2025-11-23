import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileCheck, Lock, Key, Activity } from "lucide-react";
import { LGPDConsentModal } from "@/components/security/LGPDConsentModal";
import { DataExportPanel } from "@/components/security/DataExportPanel";
import { MFASetupPanel } from "@/components/security/MFASetupPanel";
import { useLGPDConsents } from "@/hooks/useLGPDConsents";

export default function SecuritySettings() {
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const { consents, isLoading } = useLGPDConsents();

  const grantedConsents = consents?.filter((c) => c.granted).length || 0;
  const totalConsents = 4; // Total de tipos de consentimento

  return (
    <MainLayout>
      <div className="container max-w-6xl py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Segurança & Privacidade
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie configurações de segurança, privacidade e conformidade LGPD
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Consentimentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{grantedConsents}/{totalConsents}</div>
              <p className="text-xs text-muted-foreground mt-1">Autorizações concedidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Autenticação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">MFA</div>
              <p className="text-xs text-muted-foreground mt-1">Proteção de dois fatores</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Atividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">Eventos de segurança (7 dias)</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Principais */}
        <Tabs defaultValue="lgpd" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lgpd">LGPD & Consentimentos</TabsTrigger>
            <TabsTrigger value="mfa">MFA</TabsTrigger>
            <TabsTrigger value="data">Portabilidade</TabsTrigger>
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="lgpd" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Consentimentos LGPD</CardTitle>
                <CardDescription>
                  Gerencie suas autorizações conforme a Lei Geral de Proteção de Dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium mb-2">Seus Direitos</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ Confirmar se seus dados estão sendo tratados</li>
                      <li>✓ Acessar seus dados pessoais</li>
                      <li>✓ Corrigir dados incompletos ou incorretos</li>
                      <li>✓ Solicitar anonimização ou exclusão</li>
                      <li>✓ Revogar consentimentos a qualquer momento</li>
                      <li>✓ Portabilidade dos seus dados</li>
                    </ul>
                  </div>

                  <Button onClick={() => setConsentModalOpen(true)} className="w-full">
                    <FileCheck className="mr-2 h-4 w-4" />
                    Gerenciar Consentimentos
                  </Button>

                  {!isLoading && consents && consents.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Status Atual</h4>
                      {consents.map((consent) => (
                        <div
                          key={consent.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <span className="text-sm capitalize">
                            {consent.consent_type.replace(/_/g, " ")}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              consent.granted ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {consent.granted ? "Concedido" : "Negado"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mfa" className="space-y-4">
            <MFASetupPanel />
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <DataExportPanel />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Log de Auditoria</CardTitle>
                <CardDescription>
                  Histórico de eventos de segurança e acesso aos seus dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum evento de segurança registrado nos últimos 7 dias</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <LGPDConsentModal open={consentModalOpen} onOpenChange={setConsentModalOpen} />
    </MainLayout>
  );
}
