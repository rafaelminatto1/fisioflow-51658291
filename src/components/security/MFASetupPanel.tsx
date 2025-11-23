import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Lock, Key, Copy, Check } from "lucide-react";
import { useMFASettings, MFAMethod } from "@/hooks/useMFASettings";
import { toast } from "sonner";

export function MFASetupPanel() {
  const { settings, isLoading, isMFAEnabled, enableMFA, disableMFA, isEnabling, isDisabling } =
    useMFASettings();
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod>("totp");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleEnableMFA = async () => {
    try {
      const result = await enableMFA(selectedMethod);
      if (result && result.backupCodes) {
        setBackupCodes(result.backupCodes);
      }
    } catch (error) {
      console.error("Erro ao ativar MFA:", error);
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
    return <div>Carregando configurações...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Autenticação de Dois Fatores (MFA)
        </CardTitle>
        <CardDescription>
          Adicione uma camada extra de segurança à sua conta
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

        {!isMFAEnabled && !backupCodes && (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                A autenticação de dois fatores adiciona uma camada extra de segurança, exigindo um código
                adicional além da sua senha ao fazer login.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Método de Autenticação</label>
              <Select value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as MFAMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totp">App Autenticador (Google Authenticator, Authy)</SelectItem>
                  <SelectItem value="email">Código por Email</SelectItem>
                  <SelectItem value="sms">Código por SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleEnableMFA} disabled={isEnabling} className="w-full">
              <Shield className="mr-2 h-4 w-4" />
              {isEnabling ? "Ativando..." : "Ativar MFA"}
            </Button>
          </div>
        )}

        {backupCodes && (
          <div className="space-y-4">
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <Key className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <strong>IMPORTANTE:</strong> Guarde estes códigos de backup em um local seguro. Você pode
                usá-los para acessar sua conta se perder acesso ao método de autenticação principal.
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
                Sua conta está protegida com autenticação de dois fatores via{" "}
                {settings?.mfa_method === "totp" && "App Autenticador"}
                {settings?.mfa_method === "email" && "Email"}
                {settings?.mfa_method === "sms" && "SMS"}
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
