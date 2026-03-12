import { useState } from 'react';
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, Check, UserPlus, Mail, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { invitationsApi } from '@/lib/api/workers-client';
import { emailSchema } from '@/lib/validations/auth';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useIsMobile } from '@/hooks/use-mobile';

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AppRole = 'fisioterapeuta' | 'estagiario' | 'admin';

export function InviteUserModal({ open, onOpenChange }: InviteUserModalProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('fisioterapeuta');
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateInvite = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validar email
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        setError(emailResult.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { data } = await invitationsApi.create({
        email,
        role,
      });

      if (!data) {
        throw new Error('Nenhum dado retornado');
      }

      // Gerar link de convite
      const inviteData = data as { token: string; expires_at: string };
      const link = `${window.location.origin}/auth?invite=${inviteData.token}`;
      setInviteLink(link);

      toast({
        title: 'Convite criado com sucesso!',
        description: `Convite enviado para ${email}`,
      });
    } catch (err: unknown) {
      logger.error('Error creating invitation', err, 'InviteUserModal');
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar convite. Tente novamente.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({
      title: 'Link copiado!',
      description: 'Link de convite copiado para a área de transferência',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setEmail('');
    setRole('fisioterapeuta');
    setError('');
    setInviteLink('');
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <CustomModal 
      open={open} 
      onOpenChange={handleClose}
      isMobile={isMobile}
      contentClassName="max-w-md"
    >
      <CustomModalHeader onClose={handleClose}>
        <CustomModalTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Convidar Novo Usuário
        </CustomModalTitle>
      </CustomModalHeader>

      <CustomModalBody className="p-0 sm:p-0">
        <div className="px-6 py-4 space-y-6">
          {!inviteLink ? (
            <>
              <p className="text-sm text-muted-foreground">
                Envie um convite para adicionar um novo membro à sua organização. 
                O usuário receberá as permissões baseadas na função escolhida.
              </p>

              <form id="invite-form" onSubmit={handleCreateInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email" className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Email do Destinatário
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="usuario@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-9 rounded-xl border-slate-200 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-role" className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Função / Nível de Acesso
                  </Label>
                  <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
                    <SelectTrigger id="invite-role" className="rounded-xl border-slate-200 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisioterapeuta">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-blue-500" />
                          Fisioterapeuta
                        </div>
                      </SelectItem>
                      <SelectItem value="estagiario">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-slate-500" />
                          Estagiário
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-rose-500" />
                          Administrador
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-xl border-rose-100 bg-rose-50 text-rose-800">
                    <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
                  </Alert>
                )}
              </form>
            </>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3 text-emerald-800">
                <Check className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold mb-1">Convite criado com sucesso!</p>
                  <p>Compartilhe o link abaixo com o usuário para que ele possa completar o cadastro. Este link expira em 7 dias.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Link de Acesso Único</Label>
                <div className="flex gap-2">
                  <Input 
                    value={inviteLink} 
                    readOnly 
                    className="flex-1 rounded-xl bg-slate-50 border-slate-200 font-mono text-xs h-11" 
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="h-11 w-11 rounded-xl shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-500" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CustomModalBody>

      <CustomModalFooter isMobile={isMobile}>
        <Button 
          variant="ghost" 
          onClick={handleClose}
          className="rounded-xl h-11 px-6 font-bold text-slate-500"
        >
          {inviteLink ? 'Fechar' : 'Cancelar'}
        </Button>
        {!inviteLink && (
          <Button 
            type="submit" 
            form="invite-form"
            disabled={loading || !email}
            className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Gerar Link de Convite
          </Button>
        )}
      </CustomModalFooter>
    </CustomModal>
  );
}
