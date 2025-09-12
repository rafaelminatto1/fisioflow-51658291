import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Bell, Clock, AlertTriangle } from 'lucide-react';
import { NotificationSecurityService } from '@/lib/services/NotificationSecurityService';

interface NotificationConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: (consents: ConsentData) => void;
}

interface ConsentData {
  pushNotifications: boolean;
  dataProcessing: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function NotificationConsentModal({ 
  isOpen, 
  onClose, 
  onConsent 
}: NotificationConsentModalProps) {
  const [consents, setConsents] = useState<ConsentData>({
    pushNotifications: false,
    dataProcessing: false,
    analytics: false,
    marketing: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConsentChange = (key: keyof ConsentData, value: boolean) => {
    setConsents(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Registrar consentimentos no serviço de segurança
      await NotificationSecurityService.recordConsent({
        pushNotifications: consents.pushNotifications,
        dataProcessing: consents.dataProcessing,
        analytics: consents.analytics,
        marketing: consents.marketing,
        timestamp: new Date().toISOString(),
        ipAddress: await NotificationSecurityService.getClientIP(),
        userAgent: navigator.userAgent
      });

      onConsent(consents);
      onClose();
    } catch (error) {
      console.error('Erro ao registrar consentimento:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = consents.pushNotifications && consents.dataProcessing;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Consentimento para Notificações
          </DialogTitle>
          <DialogDescription>
            Para oferecer a melhor experiência, precisamos do seu consentimento para 
            enviar notificações e processar seus dados conforme a LGPD.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Notificações Push - Obrigatório */}
          <div className="flex items-start space-x-3 p-3 border rounded-lg">
            <Checkbox
              id="push-notifications"
              checked={consents.pushNotifications}
              onCheckedChange={(checked) => 
                handleConsentChange('pushNotifications', checked as boolean)
              }
            />
            <div className="flex-1">
              <label 
                htmlFor="push-notifications" 
                className="text-sm font-medium flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                Notificações Push
                <span className="text-red-500 text-xs">*</span>
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Receber lembretes de consultas, exercícios e alertas importantes.
              </p>
            </div>
          </div>

          {/* Processamento de Dados - Obrigatório */}
          <div className="flex items-start space-x-3 p-3 border rounded-lg">
            <Checkbox
              id="data-processing"
              checked={consents.dataProcessing}
              onCheckedChange={(checked) => 
                handleConsentChange('dataProcessing', checked as boolean)
              }
            />
            <div className="flex-1">
              <label 
                htmlFor="data-processing" 
                className="text-sm font-medium flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Processamento de Dados
                <span className="text-red-500 text-xs">*</span>
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Processar seus dados para personalizar notificações e melhorar o serviço.
              </p>
            </div>
          </div>

          {/* Analytics - Opcional */}
          <div className="flex items-start space-x-3 p-3 border rounded-lg">
            <Checkbox
              id="analytics"
              checked={consents.analytics}
              onCheckedChange={(checked) => 
                handleConsentChange('analytics', checked as boolean)
              }
            />
            <div className="flex-1">
              <label 
                htmlFor="analytics" 
                className="text-sm font-medium flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Analytics e Métricas
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Coletar dados anônimos sobre uso das notificações para melhorias.
              </p>
            </div>
          </div>

          {/* Marketing - Opcional */}
          <div className="flex items-start space-x-3 p-3 border rounded-lg">
            <Checkbox
              id="marketing"
              checked={consents.marketing}
              onCheckedChange={(checked) => 
                handleConsentChange('marketing', checked as boolean)
              }
            />
            <div className="flex-1">
              <label 
                htmlFor="marketing" 
                className="text-sm font-medium flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Comunicações de Marketing
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Receber notificações sobre novos recursos e dicas de saúde.
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
          <p className="mb-2">
            <strong>Seus direitos:</strong> Você pode revogar estes consentimentos 
            a qualquer momento nas configurações do aplicativo.
          </p>
          <p>
            Os dados são processados conforme nossa Política de Privacidade e 
            mantidos seguros com criptografia.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canProceed || isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Aceitar e Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}