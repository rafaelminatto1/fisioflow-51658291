
// Type definitions

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus, Search, Calendar, Building2, Eye, Settings } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReciboPreview, ReciboPDF, ReciboData } from '@/components/financial/ReciboPDF';
import { useRecibos, useCreateRecibo, valorPorExtenso } from '@/hooks/useRecibos';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, query as firestoreQuery, orderBy, getDocs, doc, getDoc, limit } from '@/integrations/firebase/app';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface PatientSelect {
  id: string;
  full_name: string;
  cpf?: string;
}

interface OrganizationData {
  name?: string;
  address?: string;
  logo_url?: string;
}

export default function RecibosPage() {
  const { user } = useAuth();
  const { currentOrganization: orgData } = useOrganizations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewRecibo, setPreviewRecibo] = useState<ReciboData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'lista' | 'criar' | 'config'>('lista');

  const [formData, setFormData] = useState({
    patient_id: '',
    valor: '',
    referente: '',
    cpf_cnpj_pagador: '',
    usar_dados_clinica: true,
  });

  const { data: recibos = [], isLoading } = useRecibos();
  const createRecibo = useCreateRecibo();

  // Buscar configurações da clínica
  const { data: clinicaConfig } = useQuery({
    queryKey: ['clinica-config', user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const profile = profileDoc.exists() ? profileDoc.data() : null;
      return { profile, org: orgData };
    },
    enabled: !!user,
  });

  // Buscar pacientes para seleção
  const { data: pacientes = [] } = useQuery({
    queryKey: ['pacientes-select'],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, 'patients'), orderBy('full_name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as PatientSelect[];
    },
  });

  const filteredRecibos = recibos.filter(r =>
    r.numero_recibo.toString().includes(searchTerm) ||
    (r.referente && r.referente.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Buscar último número de recibo
    const q = firestoreQuery(collection(db, 'recibos'), orderBy('numero_recibo', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    const ultimoRecibo = snapshot.empty ? null : snapshot.docs[0].data();

    const novoNumero = (ultimoRecibo?.numero_recibo || 0) + 1;
    const valorNumerico = parseFloat(formData.valor);

    // Buscar dados do paciente se selecionado
    let pagadorNome = '';
    let pagadorCpf = formData.cpf_cnpj_pagador;

    if (formData.patient_id) {
      const paciente = pacientes.find((p) => p.id === formData.patient_id);
      if (paciente) {
        pagadorNome = paciente.full_name;
        if (!pagadorCpf) pagadorCpf = paciente.cpf;
      }
    }

    const novoRecibo: ReciboData = {
      numero: novoNumero,
      valor: valorNumerico,
      valor_extenso: valorPorExtenso(valorNumerico),
      referente: formData.referente,
      dataEmissao: new Date(),
      emitente: {
        nome: formData.usar_dados_clinica
          ? (clinicaConfig?.org?.name || clinicaConfig?.profile?.full_name || 'Profissional de Saúde')
          : (clinicaConfig?.profile?.full_name || 'Profissional'),
        cpfCnpj: clinicaConfig?.profile?.cpf_cnpj,
        telefone: clinicaConfig?.profile?.phone,
        email: clinicaConfig?.profile?.email,
        endereco: (clinicaConfig?.org as OrganizationData | undefined)?.address,
      },
      pagador: pagadorNome ? {
        nome: pagadorNome,
        cpfCnpj: pagadorCpf,
      } : undefined,
      assinado: true,
      logoUrl: (clinicaConfig?.org as OrganizationData | undefined)?.logo_url,
    };

    // Salvar no banco
    await createRecibo.mutateAsync({
      patient_id: formData.patient_id || null,
      valor: valorNumerico,
      valor_extenso: valorPorExtenso(valorNumerico),
      referente: formData.referente,
      data_emissao: new Date().toISOString(),
      emitido_por: clinicaConfig?.profile?.full_name || 'Sistema',
      cpf_cnpj_emitente: clinicaConfig?.profile?.cpf_cnpj,
      assinado: true,
    });

    // Mostrar preview
    setPreviewRecibo(novoRecibo as ReciboData);
    setIsDialogOpen(false);
    setFormData({ patient_id: '', valor: '', referente: '', cpf_cnpj_pagador: '', usar_dados_clinica: true });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Recibos
            </h1>
            <p className="text-muted-foreground mt-1">Emita e gerencie recibos de pagamento</p>
          </div>
          <Button onClick={() => { setActiveTab('criar'); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Recibo
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lista' | 'criar' | 'config')}>
          <TabsList>
            <TabsTrigger value="lista">Lista de Recibos</TabsTrigger>
            <TabsTrigger value="criar">Criar Recibo</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="space-y-4">
            {/* Busca */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número ou referência..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Recibos */}
            <Card>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : filteredRecibos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhum recibo encontrado.' : 'Nenhum recibo emitido ainda.'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Referente a</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Emitido por</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecibos.map((recibo) => {
                        const reciboData: ReciboData = {
                          numero: recibo.numero_recibo,
                          valor: recibo.valor,
                          referente: recibo.referente,
                          dataEmissao: recibo.data_emissao,
                          emitente: {
                            nome: recibo.emitido_por,
                            cpfCnpj: recibo.cpf_cnpj_emitente || undefined,
                          },
                          assinado: recibo.assinado,
                        };
                        return (
                          <TableRow key={recibo.id}>
                            <TableCell className="font-medium">
                              #{recibo.numero_recibo.toString().padStart(6, '0')}
                            </TableCell>
                            <TableCell>
                              {format(new Date(recibo.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{recibo.referente}</TableCell>
                            <TableCell className="font-semibold">
                              R$ {recibo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>{recibo.emitido_por}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPreviewRecibo(reciboData)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Visualizar
                                </Button>
                                <ReciboPDF
                                  data={reciboData}
                                  fileName={`recibo-${recibo.numero_recibo}`}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="criar">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Emitir Novo Recibo</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Paciente (opcional)</Label>
                    <Select
                      value={formData.patient_id}
                      onValueChange={(v) => setFormData({ ...formData, patient_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        {pacientes.map((p: PatientSelect) => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>CPF/CNPJ do Pagador</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.cpf_cnpj_pagador}
                      onChange={(e) => setFormData({ ...formData, cpf_cnpj_pagador: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Valor *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                        required
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Referente a *</Label>
                    <Textarea
                      placeholder="Descreva o que está sendo pago..."
                      value={formData.referente}
                      onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                      required
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="usar-clinica"
                      checked={formData.usar_dados_clinica}
                      onChange={(e) => setFormData({ ...formData, usar_dados_clinica: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="usar-clinica" className="text-sm cursor-pointer">
                      Usar dados da clínica como emitente
                    </Label>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                    <p><span className="font-semibold">Emitente:</span> {formData.usar_dados_clinica ? clinicaConfig?.org?.name || clinicaConfig?.profile?.full_name : clinicaConfig?.profile?.full_name}</p>
                    <p><span className="font-semibold">CPF/CNPJ:</span> {clinicaConfig?.profile?.cpf_cnpj || 'Não cadastrado'}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Emitir Recibo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({ patient_id: '', valor: '', referente: '', cpf_cnpj_pagador: '', usar_dados_clinica: true })}
                    >
                      Limpar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações do Emitente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Configure as informações que aparecerão nos recibos emitidos.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nome da Clínica/Empresa</Label>
                    <p className="font-medium">{clinicaConfig?.org?.name || 'Não configurado'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Nome do Profissional</Label>
                    <p className="font-medium">{clinicaConfig?.profile?.full_name || 'Não configurado'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CPF/CNPJ</Label>
                    <p className="font-medium">{clinicaConfig?.profile?.cpf_cnpj || 'Não configurado'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{clinicaConfig?.profile?.phone || 'Não configurado'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{clinicaConfig?.profile?.email || 'Não configurado'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Endereço</Label>
                    <p className="font-medium">{clinicaConfig?.org?.address || 'Não configurado'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Logo</Label>
                    {clinicaConfig?.org?.logo_url ? (
                      <OptimizedImage src={clinicaConfig.org.logo_url} alt="Logo" className="h-16 mt-2" aspectRatio="auto" />
                    ) : (
                      <p className="text-muted-foreground">Não configurado</p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-400">
                  Para alterar estas configurações, acesse a página de Configurações ou Edite sua Organização.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        {previewRecibo && (
          <Dialog open={!!previewRecibo} onOpenChange={() => setPreviewRecibo(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Visualização do Recibo</DialogTitle>
              </DialogHeader>
              <ReciboPreview data={previewRecibo} />
              <DialogFooter>
                <ReciboPDF data={previewRecibo} fileName={`recibo-${previewRecibo.numero}`} />
                <Button variant="outline" onClick={() => setPreviewRecibo(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog Criar Recibo (rápido) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Emitir Recibo Rápido</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Referente a *</Label>
                <Textarea
                  placeholder="Descreva o que está sendo pago..."
                  value={formData.referente}
                  onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                  required
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Emitir</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
