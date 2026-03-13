import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from '@/components/ui/custom-modal';
import { FileText, Plus, Search, Eye, Settings, Loader2, Save, Download, X, BadgeCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReciboPreview, ReciboPDF, ReciboData } from '@/components/financial/ReciboPDF';
import { useRecibos, useCreateRecibo, valorPorExtenso } from '@/hooks/useRecibos';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAuth } from '@/contexts/AuthContext';
import { patientsApi, profileApi } from '@/lib/api/workers-client';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  const isMobile = useIsMobile();
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
      const res = await profileApi.me();
      return { profile: res?.data ?? null, org: orgData };
    },
    enabled: !!user,
  });

  // Buscar pacientes para seleção
  const { data: pacientes = [] } = useQuery({
    queryKey: ['pacientes-select'],
    queryFn: async () => {
      const res = await patientsApi.list({ limit: 500, sortBy: 'name_asc' });
      return (res?.data ?? []).map((p) => ({
        id: p.id,
        full_name: p.name || p.full_name || 'Paciente',
        cpf: p.cpf,
      }));
    },
  });

  const filteredRecibos = recibos.filter(r =>
    r.numero_recibo.toString().includes(searchTerm) ||
    (r.referente && r.referente.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const valorNumerico = parseFloat(formData.valor);
    if (isNaN(valorNumerico)) return;

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

    const created = await createRecibo.mutateAsync({
      patient_id: formData.patient_id || null,
      valor: valorNumerico,
      valor_extenso: valorPorExtenso(valorNumerico),
      referente: formData.referente,
      data_emissao: new Date().toISOString(),
      emitido_por: clinicaConfig?.profile?.full_name || 'Sistema',
      cpf_cnpj_emitente: clinicaConfig?.profile?.cpf_cnpj,
      assinado: true,
    });

    const novoRecibo: ReciboData = {
      numero: created.numero_recibo,
      valor: created.valor,
      valor_extenso: created.valor_extenso ?? valorPorExtenso(valorNumerico),
      referente: created.referente ?? formData.referente,
      dataEmissao: created.data_emissao,
      emitente: {
        nome: formData.usar_dados_clinica
          ? (clinicaConfig?.org?.name || clinicaConfig?.profile?.full_name || 'Profissional de Saúde')
          : (clinicaConfig?.profile?.full_name || 'Profissional'),
        cpfCnpj: created.cpf_cnpj_emitente ?? clinicaConfig?.profile?.cpf_cnpj,
        telefone: clinicaConfig?.profile?.phone,
        email: clinicaConfig?.profile?.email,
        endereco: (clinicaConfig?.org as OrganizationData | undefined)?.address,
      },
      pagador: pagadorNome
        ? {
            nome: pagadorNome,
            cpfCnpj: pagadorCpf,
          }
        : undefined,
      assinado: created.assinado,
      logoUrl: (clinicaConfig?.org as OrganizationData | undefined)?.logo_url,
    };

    // Mostrar preview
    setPreviewRecibo(novoRecibo as ReciboData);
    setIsDialogOpen(false);
    setFormData({ patient_id: '', valor: '', referente: '', cpf_cnpj_pagador: '', usar_dados_clinica: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Recibos
          </h1>
          <p className="text-muted-foreground mt-1">Emita e gerencie recibos de pagamento</p>
        </div>
        <Button onClick={() => { setActiveTab('criar'); setIsDialogOpen(true); }} className="rounded-xl shadow-lg gap-2">
          <Plus className="h-4 w-4" />
          Novo Recibo
        </Button>
      </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lista' | 'criar' | 'config')}>
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="lista" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Lista de Recibos</TabsTrigger>
            <TabsTrigger value="criar" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Criar Recibo</TabsTrigger>
            <TabsTrigger value="config" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="space-y-4 mt-4">
            {/* Busca */}
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por número ou referência..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-xl border-slate-200"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Recibos */}
            <Card className="border-slate-100 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredRecibos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-slate-300" />
                    </div>
                    {searchTerm ? 'Nenhum recibo encontrado.' : 'Nenhum recibo emitido ainda.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-slate-100">
                          <TableHead className="font-bold text-xs uppercase tracking-wider pl-6">Nº</TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider">Data</TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider">Referente a</TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider">Valor</TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider">Emitido por</TableHead>
                          <TableHead className="text-right font-bold text-xs uppercase tracking-wider pr-6">Ações</TableHead>
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
                            <TableRow key={recibo.id} className="hover:bg-slate-50/50 border-slate-100">
                              <TableCell className="font-bold text-slate-700 pl-6">
                                <Badge variant="outline" className="rounded-lg bg-slate-50 border-slate-200">
                                  #{recibo.numero_recibo.toString().padStart(6, '0')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-medium text-slate-500">
                                {format(new Date(recibo.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                              </TableCell>
                              <TableCell className="max-w-xs truncate font-medium text-slate-700">{recibo.referente}</TableCell>
                              <TableCell className="font-black text-slate-900 text-lg">
                                R$ {recibo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-sm text-slate-500">{recibo.emitido_por}</TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreviewRecibo(reciboData)}
                                    className="h-8 rounded-lg text-slate-400 hover:text-primary"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Ver
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="criar" className="mt-4">
            <Card className="max-w-2xl mx-auto shadow-sm border-slate-100">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Emitir Novo Recibo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase text-slate-500">Paciente (opcional)</Label>
                    <Select
                      value={formData.patient_id}
                      onValueChange={(v) => setFormData({ ...formData, patient_id: v })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 h-11">
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
                    <Label className="font-bold text-xs uppercase text-slate-500">CPF/CNPJ do Pagador</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.cpf_cnpj_pagador}
                      onChange={(e) => setFormData({ ...formData, cpf_cnpj_pagador: e.target.value })}
                      className="rounded-xl border-slate-200 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase text-slate-500">Valor (R$)*</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-400 font-black text-sm">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                        required
                        className="pl-9 rounded-xl border-slate-200 h-11 text-lg font-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase text-slate-500">Referente a *</Label>
                    <Textarea
                      placeholder="Ex: Sessão de fisioterapia realizada em 12/03/2026..."
                      value={formData.referente}
                      onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                      required
                      rows={3}
                      className="rounded-xl border-slate-200 resize-none bg-slate-50/50"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <input
                      type="checkbox"
                      id="usar-clinica"
                      checked={formData.usar_dados_clinica}
                      onChange={(e) => setFormData({ ...formData, usar_dados_clinica: e.target.checked })}
                      className="h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <Label htmlFor="usar-clinica" className="text-sm font-bold text-slate-700 cursor-pointer block">
                        Usar dados da clínica como emitente
                      </Label>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Emissor: {formData.usar_dados_clinica ? clinicaConfig?.org?.name || clinicaConfig?.profile?.full_name : clinicaConfig?.profile?.full_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={createRecibo.isPending} className="flex-1 rounded-xl h-12 bg-slate-900 text-white shadow-xl font-bold uppercase tracking-wider gap-2">
                      {createRecibo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-5 w-5" />}
                      Emitir Recibo Oficial
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({ patient_id: '', valor: '', referente: '', cpf_cnpj_pagador: '', usar_dados_clinica: true })}
                      className="rounded-xl h-12 px-6 border-slate-200"
                    >
                      Limpar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <Card className="max-w-2xl mx-auto shadow-sm border-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Configurações do Emitente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                  <p className="text-xs text-primary font-bold leading-relaxed">
                    Estas informações são extraídas do seu perfil e da organização. Elas aparecerão no cabeçalho e rodapé dos recibos PDFs gerados.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Clínica / Empresa</Label>
                    <p className="font-bold text-slate-700">{clinicaConfig?.org?.name || 'Não configurado'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Profissional Responsável</Label>
                    <p className="font-bold text-slate-700">{clinicaConfig?.profile?.full_name || 'Não configurado'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">CPF / CNPJ</Label>
                    <p className="font-bold text-slate-700">{clinicaConfig?.profile?.cpf_cnpj || 'Não configurado'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Telefone de Contato</Label>
                    <p className="font-bold text-slate-700">{clinicaConfig?.profile?.phone || 'Não configurado'}</p>
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Endereço de Emissão</Label>
                    <p className="font-bold text-slate-700">{clinicaConfig?.org?.address || 'Não configurado'}</p>
                  </div>
                  <div className="col-span-1 sm:col-span-2 pt-4 border-t border-slate-100">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Logo da Marca</Label>
                    {clinicaConfig?.org?.logo_url ? (
                      <div className="w-fit p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <OptimizedImage src={clinicaConfig.org.logo_url} alt="Logo" className="h-16" aspectRatio="auto" />
                      </div>
                    ) : (
                      <div className="h-20 w-full border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 font-bold text-xs uppercase tracking-widest">
                        Logo não cadastrado
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                  <p className="text-xs text-amber-800 font-bold">
                    Deseja alterar estes dados? Acesse o módulo de Configurações da Clínica no menu principal.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Modal - Refactored to CustomModal */}
        <CustomModal 
          open={!!previewRecibo} 
          onOpenChange={(open) => !open && setPreviewRecibo(null)}
          isMobile={isMobile}
          contentClassName="max-w-4xl h-[95vh]"
        >
          <CustomModalHeader onClose={() => setPreviewRecibo(null)}>
            <div className="flex flex-col gap-1">
              <Badge className="w-fit rounded-lg bg-primary/10 text-primary border-primary/20 uppercase text-[10px] font-bold">Documento Eletrônico</Badge>
              <CustomModalTitle className="text-2xl font-bold text-slate-800">
                Visualização do Recibo #{previewRecibo?.numero.toString().padStart(6, '0')}
              </CustomModalTitle>
            </div>
          </CustomModalHeader>

          <CustomModalBody className="p-0 sm:p-0 bg-slate-50/50">
            <ScrollArea className="h-full">
              <div className="p-6">
                {previewRecibo && <ReciboPreview data={previewRecibo} />}
              </div>
            </ScrollArea>
          </CustomModalBody>

          <CustomModalFooter isMobile={isMobile} className="bg-white border-t">
            <Button variant="ghost" onClick={() => setPreviewRecibo(null)} className="rounded-xl h-11 px-6 font-bold text-slate-500">
              Fechar
            </Button>
            <div className="flex-1" />
            {previewRecibo && (
              <ReciboPDF data={previewRecibo} fileName={`recibo-${previewRecibo.numero}`} />
            )}
          </CustomModalFooter>
        </CustomModal>

        {/* Dialog Criar Recibo (rápido) - Refactored to CustomModal */}
        <CustomModal 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen}
          isMobile={isMobile}
          contentClassName="max-w-md"
        >
          <CustomModalHeader onClose={() => setIsDialogOpen(false)}>
            <CustomModalTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Emitir Recibo Rápido
            </CustomModalTitle>
          </CustomModalHeader>

          <CustomModalBody className="p-0 sm:p-0">
            <div className="p-6 space-y-6">
              <form id="quick-recibo-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase text-slate-500">Valor Recebido (R$)*</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400 font-black text-sm">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      required
                      className="pl-9 rounded-xl border-slate-200 h-11 text-lg font-black"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase text-slate-500">Descrição do Pagamento *</Label>
                  <Textarea
                    placeholder="Ex: Pagamento de sessão avulsa..."
                    value={formData.referente}
                    onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                    required
                    rows={3}
                    className="rounded-xl border-slate-200 resize-none bg-slate-50/50"
                  />
                </div>
              </form>
            </div>
          </CustomModalBody>

          <CustomModalFooter isMobile={isMobile}>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11 px-6 font-bold text-slate-500">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              form="quick-recibo-form"
              disabled={createRecibo.isPending}
              className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white shadow-xl font-bold uppercase tracking-wider transition-all hover:scale-105"
            >
              {createRecibo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Emitir Agora
            </Button>
          </CustomModalFooter>
        </CustomModal>
      </div>
  );
}
