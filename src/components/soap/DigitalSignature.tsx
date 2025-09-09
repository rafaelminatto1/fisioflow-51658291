import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  PenTool, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Calendar, 
  Clock,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface DigitalSignatureProps {
  recordId: string;
  patientName: string;
  sessionNumber?: number;
  onSign: (signatureData: SignatureData) => Promise<boolean>;
  isReadOnly?: boolean;
  existingSignature?: {
    hash: string;
    signedAt: string;
    signedBy: string;
  };
  className?: string;
}

interface SignatureData {
  recordId: string;
  userId: string;
  timestamp: string;
  patientConsent: boolean;
  professionalDeclaration: boolean;
  signatureMethod: 'digital' | 'electronic' | 'biometric';
  ipAddress?: string;
  deviceInfo?: string;
  additionalNotes?: string;
}

export function DigitalSignature({
  recordId,
  patientName,
  sessionNumber,
  onSign,
  isReadOnly = false,
  existingSignature,
  className
}: DigitalSignatureProps) {
  const { user } = useAuth();
  const [patientConsent, setPatientConsent] = useState(false);
  const [professionalDeclaration, setProfessionalDeclaration] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState('');

  useEffect(() => {
    // Collect device information for audit trail
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    setDeviceInfo(JSON.stringify(info));
  }, []);

  const handleSign = async () => {
    if (!patientConsent || !professionalDeclaration) {
      alert('Todos os consentimentos devem ser marcados para prosseguir com a assinatura.');
      return;
    }

    setIsSigningInProgress(true);

    try {
      const signatureData: SignatureData = {
        recordId,
        userId: user?.id || '',
        timestamp: new Date().toISOString(),
        patientConsent,
        professionalDeclaration,
        signatureMethod: 'digital',
        deviceInfo,
        additionalNotes
      };

      const success = await onSign(signatureData);
      
      if (success) {
        // Reset form after successful signature
        setPatientConsent(false);
        setProfessionalDeclaration(false);
        setAdditionalNotes('');
      }
    } catch (error) {
      console.error('Error signing document:', error);
    } finally {
      setIsSigningInProgress(false);
    }
  };

  if (existingSignature && isReadOnly) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Shield className="w-5 h-5" />
            Documento Assinado Digitalmente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center p-6 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Assinado por</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{existingSignature.signedBy}</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data e Hora</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(existingSignature.signedAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Hash de Verificação</label>
            <div className="mt-1 p-2 bg-muted/50 rounded font-mono text-xs break-all">
              {existingSignature.hash}
            </div>
          </div>

          <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">
              Este documento possui assinatura digital válida e não pode ser modificado
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="w-5 h-5" />
          Assinatura Digital
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Confirme as informações e assine digitalmente este documento
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-3">Resumo do Documento</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="font-medium text-muted-foreground">Paciente</label>
              <p>{patientName}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Sessão</label>
              <p>#{sessionNumber || 'N/A'}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Data</label>
              <p>{format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
            </div>
          </div>
        </div>

        {/* Legal Declarations */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Declarações Obrigatórias
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <Checkbox
                id="patient-consent"
                checked={patientConsent}
                onCheckedChange={(checked) => setPatientConsent(!!checked)}
                disabled={isReadOnly}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="patient-consent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Consentimento do Paciente
                </label>
                <p className="text-xs text-muted-foreground">
                  Confirmo que o paciente foi informado sobre o tratamento proposto, 
                  riscos, benefícios e alternativas, e concordou com o plano terapêutico apresentado.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <Checkbox
                id="professional-declaration"
                checked={professionalDeclaration}
                onCheckedChange={(checked) => setProfessionalDeclaration(!!checked)}
                disabled={isReadOnly}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="professional-declaration"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Declaração Profissional
                </label>
                <p className="text-xs text-muted-foreground">
                  Declaro que as informações contidas neste registro são verdadeiras e baseadas 
                  em minha avaliação profissional, estando em conformidade com os códigos de ética 
                  e legislação vigente.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="text-sm font-medium">Observações Adicionais (Opcional)</label>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Observações específicas sobre a sessão, intercorrências, ou informações complementares..."
            rows={3}
            disabled={isReadOnly}
          />
        </div>

        {/* Professional Information */}
        <div className="p-4 bg-primary/5 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <User className="w-4 h-4" />
            Informações do Profissional
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-medium text-muted-foreground">Nome</label>
              <p>{user?.user_metadata?.full_name || user?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">CREFITO</label>
              <p>{user?.user_metadata?.professional_id || 'Não informado'}</p>
            </div>
          </div>
        </div>

        {/* Signature Actions */}
        {!isReadOnly && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">
                Ao assinar, você confirma que todas as informações estão corretas e completas.
              </span>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                onClick={handleSign}
                disabled={!patientConsent || !professionalDeclaration || isSigningInProgress}
                className="min-w-[150px]"
              >
                {isSigningInProgress ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Assinando...
                  </>
                ) : (
                  <>
                    <PenTool className="w-4 h-4 mr-2" />
                    Assinar Documento
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-3 h-3" />
            <span className="font-medium">Informações de Segurança:</span>
          </div>
          <ul className="space-y-1 text-xs">
            <li>• Esta assinatura digital possui valor legal equivalente à assinatura manuscrita</li>
            <li>• O documento assinado não poderá ser alterado após a finalização</li>
            <li>• Dados de auditoria incluem timestamp, IP e informações do dispositivo</li>
            <li>• Todas as assinaturas são registradas em conformidade com a LGPD</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}