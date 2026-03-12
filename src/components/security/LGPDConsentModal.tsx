import { useEffect, useState } from 'react';
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, FileCheck, Info, Loader2, BadgeCheck } from "lucide-react";
import { useLGPDConsents, ConsentType } from "@/hooks/useLGPDConsents";
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface LGPDConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const consentDescriptions: Record<ConsentType, { title: string; description: string }> = {
  dados_pessoais: {
    title: "Tratamento de Dados Pessoais",
    description: "Autorizo o tratamento dos meus dados pessoais (nome, email, telefone, CPF) para fins de gestão clínica e atendimento fisioterapêutico.",
  },
  dados_sensiveis: {
    title: "Tratamento de Dados Sensíveis de Saúde",
    description: "Autorizo o tratamento dos meus dados sensíveis de saúde (prontuários médicos, histórico de tratamentos, exames) exclusivamente para fins terapêuticos.",
  },
  comunicacao_marketing: {
    title: "Comunicação e Marketing",
    description: "Autorizo o envio de comunicações sobre novidades, promoções e conteúdos informativos relacionados à fisioterapia e saúde.",
  },
  compartilhamento_terceiros: {
    title: "Compartilhamento com Terceiros",
    description: "Autorizo o compartilhamento dos meus dados com parceiros para fins específicos (ex: laboratórios, convênios médicos) quando necessário para o tratamento.",
  },
};

export function LGPDConsentModal({ open, onOpenChange }: LGPDConsentModalProps) {
  const isMobile = useIsMobile();
  const { consents, manageConsent, isManaging, hasConsent } = useLGPDConsents();
  const [pendingConsents, setPendingConsents] = useState<Record<ConsentType, boolean>>({
    dados_pessoais: false,
    dados_sensiveis: false,
    comunicacao_marketing: false,
    compartilhamento_terceiros: false,
  });

  const handleConsentChange = (type: ConsentType, checked: boolean) => {
    setPendingConsents((prev) => ({ ...prev, [type]: checked }));
  };

  const handleSubmit = () => {
    Object.entries(pendingConsents).forEach(([type, granted]) => {
      const currentConsent = hasConsent(type as ConsentType);
      if (currentConsent !== granted) {
        manageConsent({ consentType: type as ConsentType, granted });
      }
    });
    onOpenChange(false);
  };

  useEffect(() => {
    if (!consents.length) return;

    const current: Record<ConsentType, boolean> = {
      dados_pessoais: false,
      dados_sensiveis: false,
      comunicacao_marketing: false,
      compartilhamento_terceiros: false,
    };

    consents.forEach((consent) => {
      current[consent.consent_type] = consent.granted;
    });

    setPendingConsents(current);
  }, [consents, open]);

  return (
    <CustomModal 
      open={open} 
      onOpenChange={onOpenChange}
      isMobile={isMobile}
      contentClassName="max-w-2xl"
    >
      <CustomModalHeader onClose={() => onOpenChange(false)}>
        <CustomModalTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Gerenciar Consentimentos LGPD
        </CustomModalTitle>
      </CustomModalHeader>

      <CustomModalBody className="p-0 sm:p-0">
        <div className="px-6 py-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Gerencie suas autorizações de uso de dados conforme a Lei Geral de Proteção de Dados (LGPD)
          </p>

          <Alert className="bg-primary/5 border-primary/10">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs text-slate-600">
              Você pode revogar qualquer consentimento a qualquer momento. Isso pode impactar algumas funcionalidades do sistema que dependem desses dados.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {(Object.keys(consentDescriptions) as ConsentType[]).map((type) => {
              const { title, description } = consentDescriptions[type];
              const isRequired = type === "dados_pessoais" || type === "dados_sensiveis";
              const isChecked = pendingConsents[type];

              return (
                <div 
                  key={type} 
                  className={cn(
                    "flex items-start space-x-3 rounded-xl border p-4 transition-all",
                    isChecked ? "bg-primary/5 border-primary/20" : "bg-white border-slate-100"
                  )}
                >
                  <Checkbox
                    id={`lgpd-${type}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleConsentChange(type, checked as boolean)
                    }
                    disabled={isRequired && hasConsent(type)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`lgpd-${type}`}
                      className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                    >
                      {title}
                      {isRequired && (
                        <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded uppercase font-bold">Obrigatório</span>
                      )}
                    </Label>
                    <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-dashed">
            <FileCheck className="h-3.5 w-3.5" />
            <span>
              Ao conceder consentimento, você declara estar ciente da nossa Política de Privacidade.
            </span>
          </div>
        </div>
      </CustomModalBody>

      <CustomModalFooter isMobile={isMobile}>
        <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isManaging}
          className="rounded-xl px-8 bg-slate-900 text-white hover:bg-slate-800 gap-2 shadow-lg"
        >
          {isManaging ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BadgeCheck className="h-4 w-4" />
          )}
          Salvar Preferências
        </Button>
      </CustomModalFooter>
    </CustomModal>
  );
}
