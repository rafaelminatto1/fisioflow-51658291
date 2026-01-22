import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Alert, AlertDescription } from '@/components/shared/ui/alert';
import { Badge } from '@/components/shared/ui/badge';
import { Shield, Lock, Key, Copy, Check, Mail, Send } from "lucide-react";
import { useMFASettings } from "@/hooks/useMFASettings";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/web/ui/input-otp';

export function MFASetupPanel() {
  const {
    isLoading, 
    isMFAEnabled, 
    enableMFA, 
    disableMFA, 
    sendOTP,
    verifyOTP,
    isEnabling, 
    isDisabling,
    isSendingOTP,
    isVerifyingOTP,
  } = useMFASettings();
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleEnableMFA = async () => {
    try {
      // Send OTP first
      await sendOTP();
      setShowOTPInput(true);
    } catch (error) {
      console.error("Erro ao enviar OTP:", error);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (otpCode.length !== 6) {
      toast.error("Digite o código de 6 dígitos");
      return;
    }

    try {
      await verifyOTP(otpCode);
      const result = await enableMFA("email");
      if (result && result.backupCodes) {
        setBackupCodes(result.backupCodes);
      }
      setShowOTPInput(false);
      setOtpCode("");
    } catch (error) {
      console.error("Erro ao verificar OTP:", error);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Código copiado!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyAllCodes = () => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join("\n"));
      toast.success("Todos os códigos copiados!");
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando configurações...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Autenticação de Dois Fatores (MFA)
        </CardTitle>
        <CardDescription>
          Adicione uma camada extra de segurança à sua conta via código por email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Status do MFA</p>
              <p className="text-xs text-muted-foreground">
                {isMFAEnabled ? "Proteção ativada" : "Proteção desativada"}
              </p>
            </div>
          </div>
          <Badge variant={isMFAEnabled ? "default" : "secondary"}>
            {isMFAEnabled ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        {!isMFAEnabled && !backupCodes && !showOTPInput && (
          <div className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                A autenticação de dois fatores enviará um código de verificação para seu email 
                sempre que você fizer login, adicionando uma camada extra de segurança.
              </AlertDescription>
            </Alert>

            <Button onClick={handleEnableMFA} disabled={isSendingOTP} className="w-full">
              <Shield className="mr-2 h-4 w-4" />
              {isSendingOTP ? "Enviando código..." : "Ativar MFA por Email"}
            </Button>
          </div>
        )}

        {showOTPInput && (
          <div className="space-y-4">
            <Alert>
              <Send className="h-4 w-4" />
              <AlertDescription>
                Enviamos um código de 6 dígitos para seu email. Digite-o abaixo para confirmar.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col items-center space-y-4">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOTPInput(false);
                    setOtpCode("");
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleVerifyAndEnable}
                  disabled={isVerifyingOTP || isEnabling || otpCode.length !== 6}
                  className="flex-1"
                >
                  {isVerifyingOTP || isEnabling ? "Verificando..." : "Verificar e Ativar"}
                </Button>
              </div>

              <Button
                variant="link"
                size="sm"
                onClick={handleEnableMFA}
                disabled={isSendingOTP}
              >
                {isSendingOTP ? "Enviando..." : "Reenviar código"}
              </Button>
            </div>
          </div>
        )}

        {backupCodes && (
          <div className="space-y-4">
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <Key className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <strong>IMPORTANTE:</strong> Guarde estes códigos de backup em um local seguro. Você pode
                usá-los para acessar sua conta se perder acesso ao seu email.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Códigos de Backup</label>
                <Button size="sm" variant="outline" onClick={copyAllCodes}>
                  <Copy className="mr-2 h-3 w-3" />
                  Copiar Todos
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code) => (
                  <div
                    key={code}
                    className="flex items-center justify-between rounded-lg border bg-muted p-2 font-mono text-sm"
                  >
                    <span>{code}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyCode(code)}
                    >
                      {copiedCode === code ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setBackupCodes(null);
                window.location.reload();
              }}
            >
              Concluir Configuração
            </Button>
          </div>
        )}

        {isMFAEnabled && !backupCodes && (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Sua conta está protegida com autenticação de dois fatores via Email OTP.
              </AlertDescription>
            </Alert>

            <Button variant="destructive" onClick={() => disableMFA()} disabled={isDisabling} className="w-full">
              <Lock className="mr-2 h-4 w-4" />
              {isDisabling ? "Desativando..." : "Desativar MFA"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
