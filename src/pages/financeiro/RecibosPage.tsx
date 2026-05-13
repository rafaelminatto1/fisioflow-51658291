/**
 * Recibos Page - Financeiro Premium
 * Refactored for modularity and performance.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRecibos } from "@/hooks/useRecibos";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/contexts/AuthContext";
import { patientsApi, profileApi } from "@/api/v2";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { type ReciboData } from "@/components/financial/ReciboPDF";

// Sub-components
import { RecibosTable } from "./components/recibos/RecibosTable";
import { ReciboForm } from "./components/recibos/ReciboForm";
import { ReciboSettings } from "./components/recibos/ReciboSettings";
import { ReciboDetailsModal } from "./components/recibos/ReciboDetailsModal";
import { useReciboForm } from "./components/recibos/useReciboForm";

export function RecibosContent({ autoOpenCreate = false, onAutoOpenHandled }: { autoOpenCreate?: boolean; onAutoOpenHandled?: () => void } = {}) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { currentOrganization, updateOrganization, isUpdating } = useOrganizations();
  
  const [activeTab, setActiveTab] = useState<"lista" | "criar" | "config">("lista");
  const [previewRecibo, setPreviewRecibo] = useState<ReciboData | null>(null);
  const [_isDialogOpen, _setIsDialogOpen] = useState(false);

  const [receiptConfig, setReceiptConfig] = useState({
    custom_issuer_name: "",
    custom_professional_name: "",
    disclaimer_text: "Este recibo serve como comprovante de pagamento para todos os fins de direito. Documento emitido eletronicamente conforme Lei nº 14.063/2020 (Brasil).",
    show_disclaimer: true,
    assinado_padrao: true,
  });

  const { data: recibos = [], isLoading } = useRecibos();

  // Buscar configurações da clínica e pacientes
  const { data: clinicaConfig } = useQuery({
    queryKey: ["clinica-config", user?.uid, currentOrganization?.id],
    queryFn: async () => {
      if (!user) return null;
      const res = await profileApi.me();
      return { profile: res?.data ?? null, org: currentOrganization };
    },
    enabled: !!user && !!currentOrganization,
  });

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes-select"],
    queryFn: async () => {
      const res = await patientsApi.list({ limit: 500, sortBy: "name_asc", minimal: true });
      return (res?.data ?? []).map((p) => ({
        id: p.id,
        full_name: p.name || p.full_name || "Paciente",
        cpf: p.cpf,
      }));
    },
  });

  // Sincronizar configurações
  useEffect(() => {
    if (clinicaConfig?.org?.settings?.receipt_settings) {
      const settings = clinicaConfig.org.settings.receipt_settings as any;
      setReceiptConfig({
        custom_issuer_name: settings.custom_issuer_name || currentOrganization?.name || "",
        custom_professional_name: settings.custom_professional_name || clinicaConfig.profile?.full_name || "",
        disclaimer_text: settings.disclaimer_text || "Este recibo serve como comprovante de pagamento para todos os fins de direito. Documento emitido eletronicamente conforme Lei nº 14.063/2020 (Brasil).",
        show_disclaimer: settings.show_disclaimer !== false,
        assinado_padrao: settings.assinado_padrao !== false,
      });
    } else if (clinicaConfig) {
      setReceiptConfig((prev) => ({
        ...prev,
        custom_issuer_name: prev.custom_issuer_name || currentOrganization?.name || "",
        custom_professional_name: prev.custom_professional_name || clinicaConfig.profile?.full_name || "",
      }));
    }
  }, [clinicaConfig, currentOrganization]);

  const { formData, setFormData, handleOCRExtracted, handleSubmit, isSubmitting } = useReciboForm(pacientes, clinicaConfig, receiptConfig);

  useEffect(() => {
    if (autoOpenCreate) {
      setActiveTab("criar");
      onAutoOpenHandled?.();
    }
  }, [autoOpenCreate, onAutoOpenHandled]);

  const handleSaveConfig = async () => {
    if (!currentOrganization?.id) return;
    try {
      await updateOrganization({
        id: currentOrganization.id,
        settings: { ...currentOrganization.settings, receipt_settings: receiptConfig },
      });
      toast.success("Configurações salvas!");
    } catch (error) {
      toast.error("Erro ao salvar.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Emissão de Recibos
          </h2>
          <p className="text-muted-foreground mt-1">Gere comprovantes profissionais para seus pacientes</p>
        </div>
        <Button onClick={() => setActiveTab("criar")} className="rounded-xl shadow-lg gap-2">
          <Plus className="h-4 w-4" />
          Novo Recibo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="lista" className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider">Histórico</TabsTrigger>
          <TabsTrigger value="criar" className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider">Novo Recibo</TabsTrigger>
          <TabsTrigger value="config" className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider">Configurar</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          <RecibosTable 
            recibos={recibos} 
            isLoading={isLoading} 
            onPreview={setPreviewRecibo} 
          />
        </TabsContent>

        <TabsContent value="criar" className="mt-4">
          <ReciboForm 
            formData={formData}
            setFormData={setFormData}
            pacientes={pacientes}
            clinicaConfig={clinicaConfig}
            handleOCRExtracted={handleOCRExtracted}
            onSubmit={async (e) => {
              const res = await handleSubmit(e);
              if (res) setPreviewRecibo(res);
            }}
            isSubmitting={isSubmitting}
          />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <ReciboSettings 
            receiptConfig={receiptConfig}
            setReceiptConfig={setReceiptConfig}
            onSave={handleSaveConfig}
            isUpdating={isUpdating}
          />
        </TabsContent>
      </Tabs>

      <ReciboDetailsModal 
        previewRecibo={previewRecibo}
        onClose={() => setPreviewRecibo(null)}
        isMobile={isMobile}
      />
    </div>
  );
}

export default function RecibosPage() {
  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <RecibosContent />
      </div>
    </MainLayout>
  );
}
