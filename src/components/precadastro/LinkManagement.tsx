import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Badge } from '@/components/shared/ui/badge';
import { Switch } from '@/components/shared/ui/switch';
import { Textarea } from '@/components/shared/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared/ui/dialog';
import { Plus, Copy, MessageCircle, QrCode, Loader2, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';

interface LinkManagementProps {
    tokens: any[];
    isLoading: boolean;
    onToggleStatus: (id: string, currentStatus: boolean) => void;
    onCreateLink: (data: any) => Promise<void>;
    isCreating: boolean;
}

const AVAILABLE_FIELDS = [
    { id: 'nome', label: 'Nome completo', defaultRequired: true },
    { id: 'email', label: 'E-mail', defaultRequired: true },
    { id: 'telefone', label: 'Telefone/WhatsApp', defaultRequired: true },
    { id: 'data_nascimento', label: 'Data de Nascimento', defaultRequired: false },
    { id: 'endereco', label: 'Endereço', defaultRequired: false },
    { id: 'cpf', label: 'CPF', defaultRequired: false },
    { id: 'convenio', label: 'Convênio/Plano de Saúde', defaultRequired: false },
    { id: 'queixa_principal', label: 'Queixa Principal', defaultRequired: false },
];

export const LinkManagement = ({ tokens, isLoading, onToggleStatus, onCreateLink, isCreating }: LinkManagementProps) => {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [qrCodeOpen, setQrCodeOpen] = useState<string | null>(null);

    const [newToken, setNewToken] = useState({
        nome: '',
        descricao: '',
        validade_dias: 30,
        max_usos: '',
        campos_obrigatorios: ['nome', 'email', 'telefone'] as string[],
        campos_opcionais: [] as string[]
    });

    const getFullLink = (token: string) => `${window.location.origin}/pre-cadastro/${token}`;

    const copyLink = (token: string) => {
        navigator.clipboard.writeText(getFullLink(token));
        toast.success('Link copiado!');
    };

    const shareWhatsApp = (token: string) => {
        const url = getFullLink(token);
        const message = encodeURIComponent(
            `Olá! 👋\n\nPara agilizar seu atendimento, preencha seu pré-cadastro através do link abaixo:\n\n${url}\n\nLevará apenas alguns minutos. Aguardamos você! 💙`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const handleCreate = async () => {
        await onCreateLink(newToken);
        setIsCreateOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setNewToken({
            nome: '',
            descricao: '',
            validade_dias: 30,
            max_usos: '',
            campos_obrigatorios: ['nome', 'email', 'telefone'],
            campos_opcionais: []
        });
    };

    const toggleFieldRequired = (fieldId: string) => {
        const isRequired = newToken.campos_obrigatorios.includes(fieldId);
        const isOptional = newToken.campos_opcionais.includes(fieldId);

        if (isRequired) {
            setNewToken({
                ...newToken,
                campos_obrigatorios: newToken.campos_obrigatorios.filter(f => f !== fieldId),
                campos_opcionais: [...newToken.campos_opcionais, fieldId]
            });
        } else if (isOptional) {
            setNewToken({
                ...newToken,
                campos_opcionais: newToken.campos_opcionais.filter(f => f !== fieldId)
            });
        } else {
            setNewToken({
                ...newToken,
                campos_obrigatorios: [...newToken.campos_obrigatorios, fieldId]
            });
        }
    };

    const getFieldStatus = (fieldId: string): 'required' | 'optional' | 'hidden' => {
        if (newToken.campos_obrigatorios.includes(fieldId)) return 'required';
        if (newToken.campos_opcionais.includes(fieldId)) return 'optional';
        return 'hidden';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Links de Pré-cadastro</CardTitle>
                        <CardDescription>Links para compartilhar com potenciais pacientes</CardDescription>
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Criar Link
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Criar Link de Pré-cadastro</DialogTitle>
                                <DialogDescription>
                                    Configure os campos que o paciente deverá preencher
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nome do Link</Label>
                                        <Input
                                            value={newToken.nome}
                                            onChange={(e) => setNewToken({ ...newToken, nome: e.target.value })}
                                            placeholder="Ex: Link Instagram, Campanha Google"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label>Validade (dias)</Label>
                                            <Input
                                                type="number"
                                                value={newToken.validade_dias}
                                                onChange={(e) => setNewToken({ ...newToken, validade_dias: parseInt(e.target.value) || 30 })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Máx. usos</Label>
                                            <Input
                                                type="number"
                                                value={newToken.max_usos}
                                                onChange={(e) => setNewToken({ ...newToken, max_usos: e.target.value })}
                                                placeholder="∞"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Descrição (visível para o paciente)</Label>
                                    <Textarea
                                        value={newToken.descricao}
                                        onChange={(e) => setNewToken({ ...newToken, descricao: e.target.value })}
                                        placeholder="Preencha seus dados para agendar sua avaliação"
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="h-4 w-4" />
                                        <Label className="text-base font-medium">Campos do Formulário</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Clique para alternar: <Badge variant="default" className="mx-1">Obrigatório</Badge>
                                        → <Badge variant="secondary" className="mx-1">Opcional</Badge>
                                        → <Badge variant="outline" className="mx-1">Oculto</Badge>
                                    </p>

                                    <div className="grid grid-cols-2 gap-2">
                                        {AVAILABLE_FIELDS.map((field) => {
                                            const status = getFieldStatus(field.id);
                                            return (
                                                <button
                                                    key={field.id}
                                                    type="button"
                                                    onClick={() => toggleFieldRequired(field.id)}
                                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors text-left"
                                                >
                                                    <span className="text-sm">{field.label}</span>
                                                    <Badge
                                                        variant={
                                                            status === 'required' ? 'default' :
                                                                status === 'optional' ? 'secondary' :
                                                                    'outline'
                                                        }
                                                    >
                                                        {status === 'required' ? 'Obrigatório' :
                                                            status === 'optional' ? 'Opcional' :
                                                                'Oculto'}
                                                    </Badge>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                <Button onClick={handleCreate} disabled={isCreating}>
                                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Link'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : tokens?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Nenhum link criado ainda
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tokens?.map((t) => (
                            <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4 bg-card hover:bg-accent/5 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-medium text-lg text-primary">{t.nome || 'Link de Pré-cadastro'}</h4>
                                        <Badge variant={t.ativo ? 'default' : 'secondary'}>
                                            {t.ativo ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {t.usos_atuais} usos {t.max_usos ? `de ${t.max_usos}` : '(ilimitado)'}
                                        {t.expires_at && (
                                            <>
                                                {' • '}
                                                Expira em {format(new Date(t.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                                            </>
                                        )}
                                    </p>
                                    {((t.campos_obrigatorios as string[])?.length > 0 || (t.campos_opcionais as string[])?.length > 0) && (
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {(t.campos_obrigatorios as string[] || []).map((campo: string) => (
                                                <Badge key={campo} variant="outline" className="text-xs bg-primary/5">
                                                    {AVAILABLE_FIELDS.find(f => f.id === campo)?.label || campo}*
                                                </Badge>
                                            ))}
                                            {(t.campos_opcionais as string[] || []).map((campo: string) => (
                                                <Badge key={campo} variant="secondary" className="text-xs">
                                                    {AVAILABLE_FIELDS.find(f => f.id === campo)?.label || campo}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={t.ativo}
                                        onCheckedChange={(checked) => onToggleStatus(t.id, checked)}
                                    />

                                    <div className="h-8 w-px bg-border mx-2" />

                                    <Dialog open={qrCodeOpen === t.token} onOpenChange={(open) => setQrCodeOpen(open ? t.token : null)}>
                                        <DialogTrigger asChild>
                                            <Button size="icon" variant="outline" title="Ver QR Code">
                                                <QrCode className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-sm flex flex-col items-center justify-center py-6">
                                            <DialogHeader>
                                                <DialogTitle className="text-center mb-4">QR Code do Link</DialogTitle>
                                            </DialogHeader>
                                            <div className="bg-white p-4 rounded-xl shadow-sm border">
                                                <QRCodeCanvas value={getFullLink(t.token)} size={200} />
                                            </div>
                                            <p className="text-sm text-muted-foreground text-center mt-4">
                                                Escaneie para acessar o pré-cadastro
                                            </p>
                                            <Button className="mt-4" variant="secondary" onClick={() => window.open(getFullLink(t.token), '_blank')}>
                                                Abrir Link
                                            </Button>
                                        </DialogContent>
                                    </Dialog>

                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => copyLink(t.token)}
                                        title="Copiar link"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="default"
                                        onClick={() => shareWhatsApp(t.token)}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        title="Enviar por WhatsApp"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
