import { useState } from 'react';
import {

  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, FileCheck, Info } from "lucide-react";
import { useLGPDConsents, ConsentType } from "@/hooks/useLGPDConsents";

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

  // Inicializar estado com consentimentos atuais
  useState(() => {
    if (consents) {
      const current: Record<string, boolean> = {};
      consents.forEach((c) => {
        current[c.consent_type] = c.granted;
      });
      setPendingConsents(current as Record<ConsentType, boolean>);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <DialogTitle>Gerenciar Consentimentos LGPD</DialogTitle>
          </div>
          <DialogDescription>
            Gerencie suas autorizações de uso de dados conforme a Lei Geral de Proteção de Dados (LGPD)
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Você pode revogar qualquer consentimento a qualquer momento. Isso pode impactar algumas funcionalidades do sistema.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {(Object.keys(consentDescriptions) as ConsentType[]).map((type) => {
            const { title, description } = consentDescriptions[type];
            const isRequired = type === "dados_pessoais" || type === "dados_sensiveis";

            return (
              <div key={type} className="flex items-start space-x-3 rounded-lg border p-4">
                <Checkbox
                  id={type}
                  checked={pendingConsents[type]}
                  onCheckedChange={(checked) =>
                    handleConsentChange(type, checked as boolean)
                  }
                  disabled={isRequired && hasConsent(type)}
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={type}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    {title}
                    {isRequired && (
                      <span className="text-xs text-destructive">(Obrigatório)</span>
                    )}
                  </Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileCheck className="h-4 w-4" />
          <span>
            Ao conceder consentimento, você está de acordo com nossa Política de Privacidade
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isManaging}>
            {isManaging ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
