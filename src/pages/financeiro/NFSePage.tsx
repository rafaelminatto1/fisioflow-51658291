/**
 * NFSe Page - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('nfse_config').upsert() → setDoc() with merge option
 * - Uses setDoc with { merge: true } to emulate upsert behavior
 */

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText, Plus, Download, Send, CheckCircle2, AlertCircle,
  Settings, Eye, Edit, Trash2, Clock, Calendar, Building2,
  Search, Filter, RefreshCw, Copy, Printer
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, setDoc, query as firestoreQuery, collection, orderBy, getDocs, limit, addDoc, QueryDocumentSnapshot } from '@/integrations/firebase/app';
nizations';

interface NFSe {
  id: string;
  numero: string;
  serie: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data_emissao: string;
  data_prestacao: string;
  destinatario: {
    nome: string;
    cnpj_cpf: string;
    endereco?: string;
  };
  prestador: {
    nome: string;
    cnpj: string;
    inscricao_municipal?: string;
  };
  servico: {
    descricao: string;
    codigo_cnae: string;
    codigo_tributario: string;
    aliquota: number;
    valor_iss: number;
  };
  status: 'rascunho' | 'emitida' | 'cancelada' | 'erro';
  chave_acesso?: string;
  protocolo?: string;
  verificacao?: string;
}

interface NFSConfig {
  ambiente: 'homologacao' | 'producao';
  municipio_codigo: string;
  cnpj_prestador: string;
  inscricao_municipal: string;
  aliquota_iss: number;
  auto_emissao: boolean;
}

// Estilos para PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: '1 solid #000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 8,
    textAlign: 'center',
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    padding: '4 8',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row' as const,
    marginBottom: 4,
  },
  label: {
    fontWeight: 'bold',
    width: '30%',
  },
  value: {
    flex: 1,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    padding: 4,
  },
  tableCell: {
    flex: 1,
  },
  totals: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
  },
  totalRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: '1 solid #000',
    fontSize: 7,
    textAlign: 'center',
    color: '#666',
  },
});

// Componente PDF da NFS-e
function NFSePDFDocument({ nfse }: { nfse: NFSe }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>NOTA FISCAL DE SERVIÇO ELETRÔNICA - NFSe</Text>
          <Text style={styles.subtitle}>Número: {nfse.numero} | Série: {nfse.serie}</Text>
        </View>

        {/* Dados da NFSe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS DA NOTA FISCAL</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Número:</Text>
            <Text style={styles.value}>{nfse.numero}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Data de Emissão:</Text>
            <Text style={styles.value}>
              {format(new Date(nfse.data_emissao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Data da Prestação:</Text>
            <Text style={styles.value}>
              {format(new Date(nfse.data_prestacao), 'dd/MM/yyyy', { locale: ptBR })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{nfse.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Prestador */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS DO PRESTADOR</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Razão Social:</Text>
            <Text style={styles.value}>{nfse.prestador.nome}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>CNPJ:</Text>
            <Text style={styles.value}>{nfse.prestador.cnpj}</Text>
          </View>
          {nfse.prestador.inscricao_municipal && (
            <View style={styles.row}>
              <Text style={styles.label}>Insc. Municipal:</Text>
              <Text style={styles.value}>{nfse.prestador.inscricao_municipal}</Text>
            </View>
          )}
        </View>

        {/* Tomador */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS DO TOMADOR</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Razão Social/Nome:</Text>
            <Text style={styles.value}>{nfse.destinatario.nome}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>CNPJ/CPF:</Text>
            <Text style={styles.value}>{nfse.destinatario.cnpj_cpf}</Text>
          </View>
          {nfse.destinatario.endereco && (
            <View style={styles.row}>
              <Text style={styles.label}>Endereço:</Text>
              <Text style={styles.value}>{nfse.destinatario.endereco}</Text>
            </View>
          )}
        </View>

        {/* Serviço */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DISCRIMINAÇÃO DOS SERVIÇOS</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Descrição</Text>
              <Text style={[styles.tableCell, { textAlign: 'right' }]}>Valor</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{nfse.servico.descricao}</Text>
              <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                R$ {nfse.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Código CNAE:</Text>
            <Text style={styles.value}>{nfse.servico.codigo_cnae}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Código Tributário:</Text>
            <Text style={styles.value}>{nfse.servico.codigo_tributario}</Text>
          </View>
        </View>

        {/* Totais */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Valor dos Serviços:</Text>
            <Text>R$ {nfse.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Alíquota ISS:</Text>
            <Text>{nfse.servico.aliquota}%</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Valor do ISS:</Text>
            <Text>R$ {nfse.servico.valor_iss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#000' }]}>
            <Text style={{ fontWeight: 'bold' }}>Valor Líquido:</Text>
            <Text style={{ fontWeight: 'bold' }}>
              R$ {(nfse.valor - nfse.servico.valor_iss).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Chave de Acesso */}
        {nfse.chave_acesso && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DADOS ADICIONAIS</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Chave de Acesso:</Text>
              <Text style={{ fontSize: 8 }}>{nfse.chave_acesso}</Text>
            </View>
            {nfse.protocolo && (
              <View style={styles.row}>
                <Text style={styles.label}>Protocolo:</Text>
                <Text style={styles.value}>{nfse.protocolo}</Text>
              </View>
            )}
            {nfse.verificacao && (
              <View style={styles.row}>
                <Text style={styles.label}>Código Verificação:</Text>
                <Text style={styles.value}>{nfse.verificacao}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Documento gerado eletronicamente conforme Lei nº 14.063/2020
          </Text>
          <Text>
            Data de geração: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function NFSePreview({ nfse, onEdit }: { nfse: NFSe; onEdit?: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="border rounded-lg p-8 bg-white max-w-3xl mx-auto shadow-lg">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
        <h1 className="text-xl font-bold">NOTA FISCAL DE SERVIÇO ELETRÔNICA - NFSe</h1>
        <p className="text-sm text-gray-600">Número: {nfse.numero} | Série: {nfse.serie}</p>
      </div>

      {/* Dados da NFSe */}
      <div className="mb-6">
        <h3 className="text-sm font-bold bg-gray-100 p-2 rounded mb-2">DADOS DA NOTA FISCAL</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="font-semibold">Número:</span> {nfse.numero}</div>
          <div><span className="font-semibold">Data de Emissão:</span> {format(new Date(nfse.data_emissao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
          <div><span className="font-semibold">Data da Prestação:</span> {format(new Date(nfse.data_prestacao), 'dd/MM/yyyy', { locale: ptBR })}</div>
          <div><span className="font-semibold">Status:</span> <Badge>{nfse.status.toUpperCase()}</Badge></div>
        </div>
      </div>

      {/* Prestador */}
      <div className="mb-6">
        <h3 className="text-sm font-bold bg-gray-100 p-2 rounded mb-2">DADOS DO PRESTADOR</h3>
        <div className="text-sm space-y-1">
          <div><span className="font-semibold">Razão Social:</span> {nfse.prestador.nome}</div>
          <div><span className="font-semibold">CNPJ:</span> {nfse.prestador.cnpj}</div>
          {nfse.prestador.inscricao_municipal && (
            <div><span className="font-semibold">Insc. Municipal:</span> {nfse.prestador.inscricao_municipal}</div>
          )}
        </div>
      </div>

      {/* Tomador */}
      <div className="mb-6">
        <h3 className="text-sm font-bold bg-gray-100 p-2 rounded mb-2">DADOS DO TOMADOR</h3>
        <div className="text-sm space-y-1">
          <div><span className="font-semibold">Razão Social/Nome:</span> {nfse.destinatario.nome}</div>
          <div><span className="font-semibold">CNPJ/CPF:</span> {nfse.destinatario.cnpj_cpf}</div>
          {nfse.destinatario.endereco && (
            <div><span className="font-semibold">Endereço:</span> {nfse.destinatario.endereco}</div>
          )}
        </div>
      </div>

      {/* Serviço */}
      <div className="mb-6">
        <h3 className="text-sm font-bold bg-gray-100 p-2 rounded mb-2">DISCRIMINAÇÃO DOS SERVIÇOS</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Descrição</th>
              <th className="text-right p-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-2">{nfse.servico.descricao}</td>
              <td className="text-right p-2">R$ {nfse.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-2 text-sm space-y-1">
          <div><span className="font-semibold">Código CNAE:</span> {nfse.servico.codigo_cnae}</div>
          <div><span className="font-semibold">Código Tributário:</span> {nfse.servico.codigo_tributario}</div>
        </div>
      </div>

      {/* Totais */}
      <div className="border rounded-lg p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span>Valor dos Serviços:</span>
          <span>R$ {nfse.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span>Alíquota ISS:</span>
          <span>{nfse.servico.aliquota}%</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span>Valor do ISS:</span>
          <span>R$ {nfse.servico.valor_iss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-base font-bold border-t pt-2">
          <span>Valor Líquido:</span>
          <span>R$ {(nfse.valor - nfse.servico.valor_iss).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Chave de Acesso */}
      {nfse.chave_acesso && (
        <div className="mb-6">
          <h3 className="text-sm font-bold bg-gray-100 p-2 rounded mb-2">DADOS ADICIONAIS</h3>
          <div className="text-sm space-y-1">
            <div><span className="font-semibold">Chave de Acesso:</span> <span className="text-xs font-mono">{nfse.chave_acesso}</span></div>
            {nfse.protocolo && <div><span className="font-semibold">Protocolo:</span> {nfse.protocolo}</div>}
            {nfse.verificacao && <div><span className="font-semibold">Código Verificação:</span> {nfse.verificacao}</div>}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 border-t pt-4">
        <p>Documento gerado eletronicamente conforme Lei nº 14.063/2020</p>
        <p>Data de geração: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
      </div>

      {/* Ações */}
      <div className="flex justify-center gap-2 mt-6">
        <PDFDownloadLink
          document={<NFSePDFDocument nfse={nfse} />}
          fileName={`nfse-${nfse.numero}.pdf`}
        >
          {({ loading }) => (
            <Button disabled={loading} size="sm">
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Gerando...' : 'Baixar PDF'}
            </Button>
          )}
        </PDFDownloadLink>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NFSePage() {
  const { user } = useAuth();
  const { currentOrganization: orgData } = useOrganizations();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [previewNFSe, setPreviewNFSe] = useState<NFSe | null>(null);
  const [editingNFSe, setEditingNFSe] = useState<NFSe | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'config'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const [formData, setFormData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
    data_prestacao: new Date().toISOString().split('T')[0],
    destinatario_nome: '',
    destinatario_cpf_cnpj: '',
    destinatario_endereco: '',
    servico_descricao: '',
    codigo_cnae: '8711500',
    codigo_tributario: '010700',
  });

  // Buscar NFSe
  const { data: nfses = [], isLoading } = useQuery({
    queryKey: ['nfse-list'],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, 'nfse'), orderBy('data_emissao', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() })) as NFSe[];
    },
  });

  // Buscar configuração
  const { data: config } = useQuery({
    queryKey: ['nfse-config'],
    queryFn: async () => {
      const docRef = doc(db, 'nfse_config', 'default');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as NFSConfig : null;
    },
  });

  // Criar NFSe
  const createNFSe = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Buscar dados do prestador
      if (!user) throw new Error('Not authenticated');
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const profile = profileDoc.exists() ? profileDoc.data() : null;

      const org = orgData;

      const valorNumerico = parseFloat(data.valor);
      const aliquota = config?.aliquota_iss || 5;
      const valorISS = (valorNumerico * aliquota) / 100;

      // Gerar número
      const q = firestoreQuery(collection(db, 'nfse'), orderBy('numero', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      const lastNFSe = snapshot.empty ? null : snapshot.docs[0].data();
      const novoNumero = (Number(lastNFSe?.numero) || 0) + 1;

      const nfse: Omit<NFSe, 'id'> = {
        numero: novoNumero.toString().padStart(10, '0'),
        serie: '1',
        tipo: data.tipo,
        valor: valorNumerico,
        data_emissao: new Date().toISOString(),
        data_prestacao: data.data_prestacao,
        destinatario: {
          nome: data.destinatario_nome,
          cnpj_cpf: data.destinatario_cpf_cnpj,
          endereco: data.destinatario_endereco,
        },
        prestador: {
          nome: org?.name || profile?.full_name || '',
          cnpj: profile?.cpf_cnpj || profile?.cnpj_cnpj || '',
          inscricao_municipal: config?.inscricao_municipal,
        },
        servico: {
          descricao: data.servico_descricao,
          codigo_cnae: data.codigo_cnae,
          codigo_tributario: data.codigo_tributario,
          aliquota,
          valor_iss: valorISS,
        },
        status: config?.auto_emissao ? 'emitida' : 'rascunho',
      };

      const docRef = await addDoc(collection(db, 'nfse'), nfse);
      return { id: docRef.id, ...nfse };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfse-list'] });
      toast.success('NFSe criada com sucesso!');
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Erro ao criar NFSe'),
  });

  const filteredNFSe = nfses.filter(nfse => {
    const matchesSearch = nfse.numero.includes(searchTerm) ||
      nfse.destinatario.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || nfse.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createNFSe.mutateAsync(formData);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      rascunho: { variant: 'secondary', label: 'Rascunho' },
      emitida: { variant: 'default', label: 'Emitida' },
      cancelada: { variant: 'destructive', label: 'Cancelada' },
      erro: { variant: 'destructive', label: 'Erro' },
    };
    const { variant, label } = config[status] || config.rascunho;
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              NFSe Eletrônica
            </h1>
            <p className="text-muted-foreground mt-1">
              Emissão e gerenciamento de Notas Fiscais de Serviço Eletrônicas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsConfigOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova NFSe
            </Button>
          </div>
        </div>

        {/* Status Indicator */}
        {config?.auto_emissao && (
          <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Emissão automática está ATIVA. NFSe serão geradas automaticamente para atendimentos concluídos.</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lista' | 'config')}>
          <TabsList>
            <TabsTrigger value="lista">Lista de NFSe</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número ou destinatário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Status</SelectItem>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="emitida">Emitida</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Lista */}
            <Card>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : !filteredNFSe.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhuma NFSe emitida ainda.</p>
                    <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                      Emitir primeira NFSe
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Data Emissão</TableHead>
                        <TableHead>Destinatário</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNFSe.map((nfse) => (
                        <TableRow key={nfse.id}>
                          <TableCell className="font-medium">{nfse.numero}</TableCell>
                          <TableCell>
                            {format(new Date(nfse.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>{nfse.destinatario.nome}</TableCell>
                          <TableCell className="font-semibold">
                            R$ {nfse.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{getStatusBadge(nfse.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewNFSe(nfse)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de NFSe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Configure os dados para emissão automática de NFSe através da API da prefeitura.
                    Verifique com o município qual a integração disponível.
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Emissão Automática</p>
                      <p className="text-sm text-muted-foreground">
                        Gerar NFSe automaticamente para cada atendimento concluído
                      </p>
                    </div>
                    <Switch
                      checked={config?.auto_emissao || false}
                      onCheckedChange={(checked) => {
                        // Atualizar configuração
                        setDoc(doc(db, 'nfse_config', 'default'), { auto_emissao: checked }, { merge: true }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['nfse-config'] });
                          toast.success('Configuração atualizada!');
                        });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ambiente</Label>
                    <Select
                      defaultValue={config?.ambiente || 'homologacao'}
                      onValueChange={(v: 'homologacao' | 'producao') => {
                        setDoc(doc(db, 'nfse_config', 'default'), { ambiente: v }, { merge: true });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homologacao">Homologação</SelectItem>
                        <SelectItem value="producao">Produção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Código do Município</Label>
                    <Input
                      defaultValue={config?.municipio_codigo || ''}
                      placeholder="Ex: 3550308 (São Paulo)"
                      onBlur={(e) => {
                        setDoc(doc(db, 'nfse_config', 'default'), { municipio_codigo: e.target.value }, { merge: true });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Inscrição Municipal</Label>
                    <Input
                      defaultValue={config?.inscricao_municipal || ''}
                      placeholder="Número da inscrição municipal"
                      onBlur={(e) => {
                        setDoc(doc(db, 'nfse_config', 'default'), { inscricao_municipal: e.target.value }, { merge: true });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Alíquota Padrão ISS (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={config?.aliquota_iss?.toString() || '5'}
                      onBlur={(e) => {
                        setDoc(doc(db, 'nfse_config', 'default'), { aliquota_iss: parseFloat(e.target.value) }, { merge: true });
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog Nova NFSe */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova NFSe</DialogTitle>
              <DialogDescription>
                Preencha os dados para emissão da Nota Fiscal de Serviço Eletrônica
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v: 'entrada' | 'saida') => setFormData({ ...formData, tipo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada (Recebido)</SelectItem>
                      <SelectItem value="saida">Saída (Pago)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor do Serviço *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">R$</span>
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
              </div>

              <div className="space-y-2">
                <Label>Data da Prestação *</Label>
                <Input
                  type="date"
                  value={formData.data_prestacao}
                  onChange={(e) => setFormData({ ...formData, data_prestacao: e.target.value })}
                  required
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Dados do Destinatário/Tomador</h3>
                <div className="space-y-2">
                  <Label>Nome/Razão Social *</Label>
                  <Input
                    placeholder="Nome do cliente ou empresa"
                    value={formData.destinatario_nome}
                    onChange={(e) => setFormData({ ...formData, destinatario_nome: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ/CPF *</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={formData.destinatario_cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, destinatario_cpf_cnpj: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input
                    placeholder="Endereço completo"
                    value={formData.destinatario_endereco}
                    onChange={(e) => setFormData({ ...formData, destinatario_endereco: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Dados do Serviço</h3>
                <div className="space-y-2">
                  <Label>Descrição do Serviço *</Label>
                  <Textarea
                    placeholder="Descreva o serviço realizado..."
                    value={formData.servico_descricao}
                    onChange={(e) => setFormData({ ...formData, servico_descricao: e.target.value })}
                    required
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código CNAE</Label>
                    <Input
                      placeholder="8711500"
                      value={formData.codigo_cnae}
                      onChange={(e) => setFormData({ ...formData, codigo_cnae: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      8711500 - Fisioterapia
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Código Tributário Municipal</Label>
                    <Input
                      placeholder="010700"
                      value={formData.codigo_tributario}
                      onChange={(e) => setFormData({ ...formData, codigo_tributario: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </form>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={createNFSe.isPending}
              >
                {createNFSe.isPending ? 'Salvando...' : 'Criar NFSe'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        {previewNFSe && (
          <Dialog open={!!previewNFSe} onOpenChange={() => setPreviewNFSe(null)}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Visualização de NFSe</DialogTitle>
              </DialogHeader>
              <NFSePreview nfse={previewNFSe} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}

export { NFSePDFDocument, NFSePreview };
