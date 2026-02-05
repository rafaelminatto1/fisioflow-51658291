/**
 * Marketing LGPD Consent Form Component
 *
 * This component manages the patient's consent for marketing use of their image and data.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileSignature,
  Shield,
  Instagram,
  Globe,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { useMarketingConsent } from '@/hooks/useMarketingConsent';
import { cn } from '@/lib/utils';

interface ConsentOption {
  key: 'social_media' | 'educational_material' | 'website';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  examples: string[];
  color: string;
}

const CONSENT_OPTIONS: ConsentOption[] = [
  {
    key: 'social_media',
    label: 'Redes Sociais',
    description: 'Uso de imagens em posts do Instagram, Facebook e LinkedIn',
    icon: Instagram,
    examples: ['Posts de antes/depois', 'Stories de evolução', 'Depoimentos em vídeo'],
    color: 'text-pink-600 bg-pink-50 border-pink-200 dark:bg-pink-950 dark:border-pink-800',
  },
  {
    key: 'educational_material',
    label: 'Material Educativo',
    description: 'Uso em apresentações e materiais internos de ensino',
    icon: GraduationCap,
    examples: ['Slides de palestras', 'Materiais para estudantes', 'Casos clínicos'],
    color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
  },
  {
    key: 'website',
    label: 'Website',
    description: 'Uso em galeria de resultados e página de depoimentos',
    icon: Globe,
    examples: ['Galeria de casos', 'Página de testimonials', 'Banner de resultados'],
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800',
  },
];

interface MarketingConsentFormProps {
  patientId: string;
  patientName: string;
  organizationId: string;
  onSuccess?: () => void;
  compact?: boolean;
}

export function MarketingConsentForm({
  patientId,
  patientName,
  organizationId,
  onSuccess,
  compact = false,
}: MarketingConsentFormProps) {
  const {
    consentDetails,
    hasConsent,
    isLoading,
    setConsent,
    revokeConsent,
    isSettingConsent,
    isRevokingConsent,
  } = useMarketingConsent(patientId);

  const [socialMedia, setSocialMedia] = useState(consentDetails?.social_media ?? false);
  const [educationalMaterial, setEducationalMaterial] = useState(consentDetails?.educational_material ?? false);
  const [website, setWebsite] = useState(consentDetails?.website ?? false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  // Update local state when consent details change
  React.useEffect(() => {
    if (consentDetails) {
      setSocialMedia(consentDetails.social_media);
      setEducationalMaterial(consentDetails.educational_material);
      setWebsite(consentDetails.website);
    }
  }, [consentDetails]);

  const hasAnyConsent = socialMedia || educationalMaterial || website;
  const previouslyHadConsent = consentDetails?.is_active && (consentDetails.social_media || consentDetails.educational_material || consentDetails.website);

  const handleSave = () => {
    if (!hasAnyConsent) {
      toast?.error('Selecione pelo menos uma opção de consentimento');
      return;
    }

    setConsent({
      organizationId,
      consentData: {
        social_media: socialMedia,
        educational_material: educationalMaterial,
        website: website,
        is_active: true,
        signed_by: patientName,
      },
    });

    onSuccess?.();
  };

  const handleRevoke = () => {
    revokeConsent();
    setShowRevokeDialog(false);
    setSocialMedia(false);
    setEducationalMaterial(false);
    setWebsite(false);
    onSuccess?.();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Carregando consentimentos...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact version for patient profile sidebar
  if (compact) {
    return (
      <Card className={cn(
        'border-2',
        hasConsent ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20'
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Consentimento Marketing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {hasConsent ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-400">
                Consentimento ativo para {[
                  consentDetails?.social_media && 'redes sociais',
                  consentDetails?.educational_material && 'material educativo',
                  consentDetails?.website && 'website',
                ].filter(Boolean).join(', ')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-700 dark:text-amber-400">
                Sem consentimento de marketing
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Termo de Consentimento de Imagem (LGPD)
            </CardTitle>
            <CardDescription className="mt-1">
              Autorização para uso de imagem e dados em materiais de marketing
            </CardDescription>
          </div>
          {hasConsent && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* LGPD Notice */}
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            LGPD - Lei Geral de Proteção de Dados
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
            O paciente tem o direito de revogar este consentimento a qualquer momento.
            A revogação não afeta o uso autorizado anteriormente, mas impedirá novas
            utilizações de sua imagem e dados.
          </AlertDescription>
        </Alert>

        {/* Current Status */}
        {previouslyHadConsent && (
          <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-900 dark:text-emerald-100">
              Consentimento já assinado
            </AlertTitle>
            <AlertDescription className="text-emerald-800 dark:text-emerald-200 text-sm">
              {patientName} já possui consentimento ativo desde{' '}
              {consentDetails?.signed_at && new Date(consentDetails.signed_at).toLocaleDateString('pt-BR')}.
              Você pode modificar as opções abaixo ou revogar completamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Consent Options */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Selecione os tipos de uso autorizados:</Label>

          {CONSENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const checked = {
              social_media: socialMedia,
              educational_material: educationalMaterial,
              website: website,
            }[option.key];

            const onChange = {
              social_media: setSocialMedia,
              educational_material: setEducationalMaterial,
              website: setWebsite,
            }[option.key];

            return (
              <div
                key={option.key}
                className={cn(
                  'border rounded-lg p-4 transition-all',
                  checked ? option.color : 'border-border bg-muted/30'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg', checked ? option.color : 'bg-muted')}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label htmlFor={option.key} className="font-semibold cursor-pointer">
                          {option.label}
                        </Label>
                        {checked && (
                          <Badge variant="secondary" className="text-xs">
                            Autorizado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {option.examples.map((example, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Switch
                    id={option.key}
                    checked={checked}
                    onCheckedChange={(checked) => onChange(checked as boolean)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Anonymization Notice */}
        {!socialMedia && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-100 text-sm">
              Importante sobre Redes Sociais
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              Sem consentimento para redes sociais, o sistema não permitirá exportar
              conteúdo com imagem identificável do paciente, mesmo com anonimização.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          {previouslyHadConsent && (
            <Button
              variant="destructive"
              onClick={() => setShowRevokeDialog(true)}
              disabled={isRevokingConsent}
            >
              Revogar Consentimento
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onSuccess}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasAnyConsent || isSettingConsent}
            >
              {isSettingConsent ? 'Salvando...' : previouslyHadConsent ? 'Atualizar' : 'Salvar Consentimento'}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar Consentimento?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O paciente {patientName} terá todos os
              consentimentos de marketing revogados. Isso impedirá novas utilizações
              de sua imagem e dados em materiais de marketing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isRevokingConsent}
            >
              {isRevokingConsent ? 'Revogando...' : 'Confirmar Revogação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Import toast function
import { toast as sonnerToast } from 'sonner';

// Create a local toast wrapper
const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
};
