/**
 * NFSe Page - Emissão de Nota Fiscal de Serviço Eletrônica
 * Suporte a seleção de paciente + sessões para pré-preenchimento automático
 */

import { useState, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText, Plus, Download, CheckCircle2,
  Settings, Eye, Edit,
  Search, Printer, ExternalLink, MessageCircle, Loader2, RefreshCw, User
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  financialApi, appointmentsApi, patientsApi,
  type NFSeConfigRecord, type NFSeRecord, type PatientRow, type AppointmentRow
} from '@/lib/api/workers-client';

// ===================== Types =====================

interface NFSe extends NFSeRecord {
  destinatario: {
    nome: string;
    cnpj_cpf: string;
    endereco?: string;
    email?: string;
  };
  prestador: {
    nome: string;
    cnpj: string;
    inscricao_municipal?: string;
    endereco?: string;
  };
  servico: {
    descricao: string;
    codigo_cnae: string;
    codigo_tributario: string;
    aliquota: number;
    valor_iss: number;
  };
}

type NFSConfig = NFSeConfigRecord;

const DEFAULT_NFSE_CONFIG: NFSConfig = {
  ambiente: 'homologacao',
  municipio_codigo: '3550308',
  cnpj_prestador: '',
  inscricao_municipal: '',
  aliquota_iss: 0,
  auto_emissao: false,
  razao_social_prestador: '',
  endereco_prestador: '',
  telefone_prestador: '',
  codigo_tuss: '04391',
  nome_responsavel: '',
  conselho_tipo: 'CREFITO-3',
  conselho_numero: '',
  percentual_impostos: 8.70,
};

// ===================== Helpers =====================

function normalizeNFSe(row: NFSeRecord): NFSe {
  return {
    ...row,
    destinatario: {
      nome: String((row.destinatario as Record<string, unknown> | undefined)?.nome ?? ''),
      cnpj_cpf: String((row.destinatario as Record<string, unknown> | undefined)?.cnpj_cpf ?? ''),
      endereco: ((row.destinatario as Record<string, unknown> | undefined)?.endereco as string | undefined) ?? undefined,
      email: ((row.destinatario as Record<string, unknown> | undefined)?.email as string | undefined) ?? undefined,
    },
    prestador: {
      nome: String((row.prestador as Record<string, unknown> | undefined)?.nome ?? ''),
      cnpj: String((row.prestador as Record<string, unknown> | undefined)?.cnpj ?? ''),
      inscricao_municipal: ((row.prestador as Record<string, unknown> | undefined)?.inscricao_municipal as string | undefined) ?? undefined,
      endereco: ((row.prestador as Record<string, unknown> | undefined)?.endereco as string | undefined) ?? undefined,
    },
    servico: {
      descricao: String((row.servico as Record<string, unknown> | undefined)?.descricao ?? ''),
      codigo_cnae: String((row.servico as Record<string, unknown> | undefined)?.codigo_cnae ?? ''),
      codigo_tributario: String((row.servico as Record<string, unknown> | undefined)?.codigo_tributario ?? ''),
      aliquota: Number((row.servico as Record<string, unknown> | undefined)?.aliquota ?? 0),
      valor_iss: Number((row.servico as Record<string, unknown> | undefined)?.valor_iss ?? 0),
    },
  };
}

/**
 * Gera o texto da discriminação de serviços no padrão NFS-e São Paulo,
 * igual ao formato das notas emitidas manualmente.
 */
function gerarDiscriminacao(params: {
  patientName: string;
  patientCpf: string;
  sessions: Array<{ date: string; tussCode: string }>;
  totalValue: number;
  valorPorSessao?: number;
  companyName: string;
  cnpj: string;
  endereco?: string;
  conselho?: string;
  nomeResponsavel?: string;
  conselhoNumero?: string;
  telefone?: string;
  percentualImpostos?: number;
}): string {
  const {
    patientName, patientCpf, sessions, totalValue,
    companyName, cnpj, endereco, conselho,
    nomeResponsavel, conselhoNumero, telefone,
    percentualImpostos = 8.70,
  } = params;

  const n = sessions.length;
  const valorTotal = totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const formatDate = (d: string) => {
    try {
      return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return d;
    }
  };

  let texto = '';

  if (n === 1) {
    const s = sessions[0];
    texto = `Paciente ${patientName}, CPF de número ${patientCpf}, realizou 1 sessão de fisioterapia musculoesquelética no dia ${formatDate(s.date)} (realizou o código TUSS: ${s.tussCode}). E efetuou o pagamento no valor R$ ${valorTotal} para a empresa ${companyName}, CNPJ: ${cnpj}`;
  } else {
    const sessionTexts = sessions.map((s, i) => {
      const prefix = i === sessions.length - 1 ? 'e ' : '';
      return `${prefix}${formatDate(s.date)} (realizou o código TUSS: ${s.tussCode})`;
    });
    const listaSessoes = sessionTexts.join(', ');
    const valorPorSessao = (totalValue / n).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    texto = `Paciente ${patientName} CPF de número ${patientCpf} realizou ${n} sessões de fisioterapia musculoesquelética nos dias ${listaSessoes}. E efetuou o pagamento no valor R$ ${valorTotal}, correspondentes a R$ ${valorPorSessao} de cada sessão, para a empresa ${companyName}, CNPJ: ${cnpj}`;

    if (endereco) texto += `, ${endereco}`;
    if (conselho) texto += `. - Conselho: ${conselho}`;
    if (nomeResponsavel) texto += ` - Nome: ${nomeResponsavel}`;
    if (conselhoNumero) texto += ` - Número do conselho: ${conselhoNumero}`;
    if (telefone) texto += ` - Telefone: ${telefone}`;
    texto += '.';
  }

  texto += `\n- Conforme Lei 12.741/2012, o percentual total de impostos incidentes neste serviço prestado é de aproximadamente ${percentualImpostos}%`;

  return texto;
}

// ===================== PDF Document =====================

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: { marginBottom: 20, borderBottom: '1 solid #000', paddingBottom: 10 },
  title: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 8, textAlign: 'center', color: '#666' },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: '4 8', marginBottom: 8 },
  row: { flexDirection: 'row' as const, marginBottom: 4 },
  label: { fontWeight: 'bold', width: '30%' },
  value: { flex: 1 },
  table: { width: '100%', borderWidth: 1, borderColor: '#000', marginBottom: 15 },
  tableRow: { flexDirection: 'row' as const, borderBottomWidth: 1, borderBottomColor: '#000', padding: 4 },
  tableCell: { flex: 1 },
  totals: { borderWidth: 1, borderColor: '#000', padding: 8 },
  totalRow: { flexDirection: 'row' as const, justifyContent: 'space-between', marginBottom: 4 },
  footer: { marginTop: 20, paddingTop: 10, borderTop: '1 solid #000', fontSize: 7, textAlign: 'center', color: '#666' },
});

function NFSePDFDocument({ nfse }: { nfse: NFSe }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>NOTA FISCAL DE SERVIÇO ELETRÔNICA - NFSe</Text>
          <Text style={pdfStyles.subtitle}>Número: {nfse.numero} | Série: {nfse.serie}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>DADOS DA NOTA FISCAL</Text>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Número:</Text>
            <Text style={pdfStyles.value}>{nfse.numero}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Data de Emissão:</Text>
            <Text style={pdfStyles.value}>
              {format(new Date(nfse.data_emissao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Status:</Text>
            <Text style={pdfStyles.value}>{nfse.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>DADOS DO PRESTADOR</Text>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Razão Social:</Text>
            <Text style={pdfStyles.value}>{nfse.prestador.nome}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>CNPJ:</Text>
            <Text style={pdfStyles.value}>{nfse.prestador.cnpj}</Text>
          </View>
          {nfse.prestador.inscricao_municipal && (
            <View style={pdfStyles.row}>
              <Text style={pdfStyles.label}>Insc. Municipal:</Text>
              <Text style={pdfStyles.value}>{nfse.prestador.inscricao_municipal}</Text>
            </View>
          )}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>DADOS DO TOMADOR</Text>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Nome:</Text>
            <Text style={pdfStyles.value}>{nfse.destinatario.nome}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>CNPJ/CPF:</Text>
            <Text style={pdfStyles.value}>{nfse.destinatario.cnpj_cpf}</Text>
          </View>
          {nfse.destinatario.endereco && (
            <View style={pdfStyles.row}>
              <Text style={pdfStyles.label}>Endereço:</Text>
              <Text style={pdfStyles.value}>{nfse.destinatario.endereco}</Text>
            </View>
          )}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>DISCRIMINAÇÃO DOS SERVIÇOS</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <Text style={pdfStyles.tableCell}>Descrição</Text>
              <Text style={[pdfStyles.tableCell, { textAlign: 'right' }]}>Valor</Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={pdfStyles.tableCell}>{nfse.servico.descricao}</Text>
              <Text style={[pdfStyles.tableCell, { textAlign: 'right' }]}>
                R$ {nfse.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.totals}>
          <View style={pdfStyles.totalRow}>
            <Text>Valor dos Serviços:</Text>
            <Text>R$ {nfse.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={pdfStyles.totalRow}>
            <Text>Alíquota ISS:</Text>
            <Text>{nfse.servico.aliquota}%</Text>
          </View>
          <View style={pdfStyles.totalRow}>
            <Text>Valor do ISS:</Text>
            <Text>R$ {nfse.servico.valor_iss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={[pdfStyles.totalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#000' }]}>
            <Text style={{ fontWeight: 'bold' }}>Valor Líquido:</Text>
            <Text style={{ fontWeight: 'bold' }}>
              R$ {(nfse.valor - nfse.servico.valor_iss).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {nfse.chave_acesso && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>DADOS ADICIONAIS</Text>
            <View style={pdfStyles.row}>
              <Text style={pdfStyles.label}>Chave de Acesso:</Text>
              <Text style={{ fontSize: 8 }}>{nfse.chave_acesso}</Text>
            </View>
            {nfse.verificacao && (
              <View style={pdfStyles.row}>
                <Text style={pdfStyles.label}>Cód. Verificação:</Text>
                <Text style={pdfStyles.value}>{nfse.verificacao}</Text>
              </View>
            )}
          </View>
        )}

        <View style={pdfStyles.footer}>
          <Text>Documento gerado eletronicamente - FisioFlow</Text>
          <Text>Data de geração: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ===================== Preview Component =====================

function NFSePreview({ nfse, onEdit }: { nfse: NFSe; onEdit?: () => void }) {
  const patientPhone = (nfse.destinatario as Record<string, unknown>)?.phone as string | undefined;

  const handleWhatsApp = () => {
    const phone = patientPhone?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Número de telefone do paciente não disponível');
      return;
    }
    const message = encodeURIComponent(
      `Olá ${nfse.destinatario.nome.split(' ')[0]}, segue sua Nota Fiscal de Serviço nº ${nfse.numero} referente ao atendimento de fisioterapia. Qualquer dúvida estou à disposição.`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="border rounded-lg p-8 bg-white max-w-3xl mx-auto shadow-lg">
      <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
        <h1 className="text-xl font-bold">NOTA FISCAL DE SERVIÇO ELETRÔNICA - NFSe</h1>
        <p className="text-sm text-gray-600">Número: {nfse.numero} | Série: {nfse.serie}</p>
        {nfse.verificacao && (
          <p className="text-xs text-gray-500 mt-1">Código de Verificação: {nfse.verificacao}</p>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-bold bg-gray-100 p-2 rounded mb-2">DADOS DA NOTA FISCAL</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="font-semibold">Número:</span> {nfse.numero}</div>
          <div>
            <span className="font-semibold">Data de Emissão:</span>{' '}
            {format(new Date(nfse.data_emissao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
          <div>
            <span className="font-semibold">Status:</span> <Badge>{nfse.status.toUpperCase()}</Badge>
          </div>
        </div>
      </div>

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

      <div className="mb-6">
        <h3 className="text-sm font-bold bg-gray-100 p-2 rounded mb-2">DADOS DO TOMADOR</h3>
        <div className="text-sm space-y-1">
          <div><span className="font-semibold">Nome:</span> {nfse.destinatario.nome}</div>
          <div><span className="font-semibold">CPF/CNPJ:</span> {nfse.destinatario.cnpj_cpf}</div>
          {nfse.destinatario.endereco && (
            <div><span className="font-semibold">Endereço:</span> {nfse.destinatario.endereco}</div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-bold bg-gray-100 p-2 rounded mb-2">DISCRIMINAÇÃO DOS SERVIÇOS</h3>
        <p className="text-sm whitespace-pre-wrap border rounded p-3 bg-gray-50">{nfse.servico.descricao}</p>
      </div>

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
          <span>VALOR TOTAL:</span>
          <span>R$ {nfse.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 border-t pt-4 mb-6">
        <p>Documento gerado eletronicamente - FisioFlow</p>
        <p>Data de geração: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <PDFDownloadLink
          document={<NFSePDFDocument nfse={nfse} />}
          fileName={`nfse-${nfse.numero}-${nfse.destinatario.nome.split(' ')[0]}.pdf`}
        >
          {({ loading }) => (
            <Button disabled={loading} size="sm">
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Gerando...' : 'Baixar PDF'}
            </Button>
          )}
        </PDFDownloadLink>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
        <Button variant="outline" size="sm" onClick={handleWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
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

// ===================== Main Page =====================

export default function NFSePage() {
  const { user } = useAuth();
  const { currentOrganization: orgData } = useOrganizations();
  const { profile } = useUserProfile();
  const organizationId = orgData?.id;
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewNFSe, setPreviewNFSe] = useState<NFSe | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'config'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Patient / session selection state
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [valorPorSessao, setValorPorSessao] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    tipo: 'saida' as 'entrada' | 'saida',
    valor: '',
    data_prestacao: new Date().toISOString().split('T')[0],
    destinatario_nome: '',
    destinatario_cpf_cnpj: '',
    destinatario_endereco: '',
    destinatario_email: '',
    servico_descricao: '',
    codigo_cnae: '8711500',
    codigo_tributario: '04391',
  });

  // ---- Queries ----

  const { data: nfses = [], isLoading } = useQuery({
    queryKey: ['nfse-list', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await financialApi.nfse.list();
      return (response.data ?? [])
        .map((row) => normalizeNFSe(row as NFSeRecord))
        .sort((a, b) => b.data_emissao.localeCompare(a.data_emissao));
    },
    enabled: !!organizationId,
  });

  const { data: config } = useQuery({
    queryKey: ['nfse-config', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await financialApi.nfseConfig.get();
      return response.data ? ({ ...DEFAULT_NFSE_CONFIG, ...response.data } as NFSConfig) : DEFAULT_NFSE_CONFIG;
    },
    enabled: !!organizationId,
  });

  const { data: allPatients = [] } = useQuery({
    queryKey: ['patients-list-nfse'],
    queryFn: async () => {
      const response = await patientsApi.list({ limit: 500 });
      return response.data ?? [];
    },
    enabled: !!organizationId,
  });

  const { data: patientAppointments = [], isFetching: loadingAppointments } = useQuery({
    queryKey: ['appointments-for-nfse', selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient) return [];
      const response = await appointmentsApi.list({
        patientId: selectedPatient.id,
        status: 'completed',
        limit: 200,
      });
      return (response.data ?? []).sort((a: AppointmentRow, b: AppointmentRow) =>
        (b.date ?? '').localeCompare(a.date ?? '')
      );
    },
    enabled: !!selectedPatient,
  });

  // ---- Filtered patient list ----
  const filteredPatients = patientSearch.length >= 2
    ? allPatients.filter((p: PatientRow) => {
        const term = patientSearch.toLowerCase();
        const name = (p.full_name || p.name || '').toLowerCase();
        const cpf = (p.cpf || '').replace(/\D/g, '');
        return name.includes(term) || cpf.includes(term.replace(/\D/g, ''));
      }).slice(0, 10)
    : [];

  // ---- Auto-generate description ----
  const regenerateDescription = useCallback((
    patient: PatientRow | null,
    sessions: AppointmentRow[],
    valor: number,
    cfg: NFSConfig | null | undefined,
  ) => {
    if (!patient || sessions.length === 0 || valor <= 0) return '';

    const companyName = cfg?.razao_social_prestador || orgData?.name || '';
    const cnpj = cfg?.cnpj_prestador || '';
    const tuss = cfg?.codigo_tuss || '04391';

    return gerarDiscriminacao({
      patientName: patient.full_name || patient.name || '',
      patientCpf: patient.cpf || '---',
      sessions: sessions.map((s) => ({ date: s.date, tussCode: tuss })),
      totalValue: valor,
      companyName,
      cnpj,
      endereco: cfg?.endereco_prestador || undefined,
      conselho: cfg?.conselho_tipo || undefined,
      nomeResponsavel: cfg?.nome_responsavel || undefined,
      conselhoNumero: cfg?.conselho_numero || undefined,
      telefone: cfg?.telefone_prestador || undefined,
      percentualImpostos: cfg?.percentual_impostos ?? 8.70,
    });
  }, [orgData?.name]);

  // ---- Select patient ----
  const handleSelectPatient = (patient: PatientRow) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.full_name || patient.name || '');
    setSelectedSessions(new Set());
    setFormData((prev) => ({
      ...prev,
      destinatario_nome: patient.full_name || patient.name || '',
      destinatario_cpf_cnpj: patient.cpf || '',
      destinatario_endereco: [patient.address, patient.city, patient.state].filter(Boolean).join(', '),
      destinatario_email: patient.email || '',
      servico_descricao: '',
    }));
  };

  // ---- Toggle session selection ----
  const toggleSession = (sessionId: string) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }

      const selected = patientAppointments.filter((a: AppointmentRow) => next.has(a.id));
      const vps = parseFloat(valorPorSessao) || 0;
      const total = vps > 0 ? vps * next.size : 0;

      if (total > 0) {
        const desc = regenerateDescription(selectedPatient, selected, total, config);
        setFormData((fd) => ({
          ...fd,
          valor: total.toFixed(2),
          data_prestacao: selected[0]?.date ?? fd.data_prestacao,
          servico_descricao: desc,
        }));
      } else {
        setFormData((fd) => ({ ...fd, data_prestacao: selected[0]?.date ?? fd.data_prestacao }));
      }

      return next;
    });
  };

  // ---- Update valor per session ----
  const handleValorPorSessaoChange = (v: string) => {
    setValorPorSessao(v);
    const vps = parseFloat(v) || 0;
    const total = vps * selectedSessions.size;
    if (total > 0 && selectedPatient) {
      const selected = patientAppointments.filter((a: AppointmentRow) => selectedSessions.has(a.id));
      const desc = regenerateDescription(selectedPatient, selected, total, config);
      setFormData((fd) => ({ ...fd, valor: total.toFixed(2), servico_descricao: desc }));
    } else {
      setFormData((fd) => ({ ...fd, valor: total > 0 ? total.toFixed(2) : fd.valor }));
    }
  };

  // ---- Update config ----
  const updateConfig = async (patch: Partial<NFSConfig>) => {
    if (!organizationId) return;
    await financialApi.nfseConfig.upsert({ ...DEFAULT_NFSE_CONFIG, ...config, ...patch });
    queryClient.invalidateQueries({ queryKey: ['nfse-config', organizationId] });
    toast.success('Configuração atualizada!');
  };

  // ---- Create NFSe ----
  const createNFSe = useMutation({
    mutationFn: async (data: typeof formData & { status: 'rascunho' | 'emitida' }) => {
      if (!user || !organizationId) throw new Error('Not authenticated');

      const valorNumerico = parseFloat(data.valor);
      const aliquota = config?.aliquota_iss ?? 0;
      const valorISS = (valorNumerico * aliquota) / 100;

      const lastNFSe = [...nfses].sort((a, b) => b.numero.localeCompare(a.numero))[0] ?? null;
      const novoNumero = (Number(lastNFSe?.numero) || 0) + 1;
      const profileData = profile as Record<string, unknown> | null;

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
          endereco: data.destinatario_endereco || undefined,
          email: data.destinatario_email || undefined,
          phone: selectedPatient?.phone,
        } as NFSe['destinatario'],
        prestador: {
          nome: config?.razao_social_prestador || orgData?.name || (profileData?.full_name as string) || '',
          cnpj: config?.cnpj_prestador || (profileData?.cpf_cnpj as string) || '',
          inscricao_municipal: config?.inscricao_municipal || undefined,
          endereco: config?.endereco_prestador || undefined,
        },
        servico: {
          descricao: data.servico_descricao,
          codigo_cnae: data.codigo_cnae,
          codigo_tributario: data.codigo_tributario,
          aliquota,
          valor_iss: valorISS,
        },
        status: data.status,
      };

      const response = await financialApi.nfse.create(nfse);
      return normalizeNFSe(response.data as NFSeRecord);
    },
    onSuccess: (created, vars) => {
      queryClient.invalidateQueries({ queryKey: ['nfse-list', organizationId] });
      if (vars.status === 'emitida') {
        toast.success('NFS-e registrada! Agora emita pelo portal da Prefeitura de São Paulo.', { duration: 6000 });
        window.open('https://nfe.prefeitura.sp.gov.br/', '_blank');
      } else {
        toast.success('Rascunho de NFS-e salvo!');
      }
      resetDialog();
    },
    onError: () => toast.error('Erro ao criar NFS-e'),
  });

  const resetDialog = () => {
    setIsDialogOpen(false);
    setSelectedPatient(null);
    setPatientSearch('');
    setSelectedSessions(new Set());
    setValorPorSessao('');
    setFormData({
      tipo: 'saida',
      valor: '',
      data_prestacao: new Date().toISOString().split('T')[0],
      destinatario_nome: '',
      destinatario_cpf_cnpj: '',
      destinatario_endereco: '',
      destinatario_email: '',
      servico_descricao: '',
      codigo_cnae: '8711500',
      codigo_tributario: '04391',
    });
  };

  // ---- Filters ----
  const filteredNFSe = nfses.filter((nfse) => {
    const matchesSearch = nfse.numero.includes(searchTerm) ||
      nfse.destinatario.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || nfse.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      rascunho: { variant: 'secondary', label: 'Rascunho' },
      emitida: { variant: 'default', label: 'Emitida' },
      cancelada: { variant: 'destructive', label: 'Cancelada' },
      erro: { variant: 'destructive', label: 'Erro' },
    };
    const { variant, label } = cfg[status] || cfg.rascunho;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const selectedAppointments = patientAppointments.filter((a: AppointmentRow) => selectedSessions.has(a.id));
  const totalValue = parseFloat(valorPorSessao || '0') * selectedSessions.size;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              NFS-e Eletrônica
            </h1>
            <p className="text-muted-foreground mt-1">
              Emissão e gerenciamento de Notas Fiscais de Serviço — São Paulo/SP
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setActiveTab('config')}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova NFS-e
            </Button>
          </div>
        </div>

        {/* Auto-emission banner */}
        {config?.auto_emissao && (
          <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Emissão automática ATIVA. NFS-e serão geradas automaticamente para atendimentos concluídos.</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lista' | 'config')}>
          <TabsList>
            <TabsTrigger value="lista">Lista de NFS-e</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>

          {/* ---- LISTA ---- */}
          <TabsContent value="lista" className="space-y-4">
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

            <Card>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Carregando...
                  </div>
                ) : !filteredNFSe.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhuma NFS-e emitida ainda.</p>
                    <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                      Emitir primeira NFS-e
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
                              <Button variant="ghost" size="icon" onClick={() => setPreviewNFSe(nfse)} title="Visualizar">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <PDFDownloadLink
                                document={<NFSePDFDocument nfse={nfse} />}
                                fileName={`nfse-${nfse.numero}.pdf`}
                              >
                                {({ loading }) => (
                                  <Button variant="ghost" size="icon" disabled={loading} title="Baixar PDF">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                              </PDFDownloadLink>
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

          {/* ---- CONFIG ---- */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Prestador de Serviço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Razão Social da Empresa *</Label>
                    <Input
                      defaultValue={config?.razao_social_prestador ?? ''}
                      placeholder="Ex: Mooca Fisioterapia RA Ltda"
                      onBlur={(e) => void updateConfig({ razao_social_prestador: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CNPJ *</Label>
                    <Input
                      defaultValue={config?.cnpj_prestador ?? ''}
                      placeholder="00.000.000/0001-00"
                      onBlur={(e) => void updateConfig({ cnpj_prestador: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inscrição Municipal *</Label>
                    <Input
                      defaultValue={config?.inscricao_municipal ?? ''}
                      placeholder="Ex: 1.353.415-7"
                      onBlur={(e) => void updateConfig({ inscricao_municipal: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      defaultValue={config?.telefone_prestador ?? ''}
                      placeholder="(11) 00000-0000"
                      onBlur={(e) => void updateConfig({ telefone_prestador: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereço Completo</Label>
                  <Input
                    defaultValue={config?.endereco_prestador ?? ''}
                    placeholder="Rua, número - Bairro - São Paulo - CEP"
                    onBlur={(e) => void updateConfig({ endereco_prestador: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Responsável Técnico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Responsável</Label>
                    <Input
                      defaultValue={config?.nome_responsavel ?? ''}
                      placeholder="Nome completo do fisioterapeuta"
                      onBlur={(e) => void updateConfig({ nome_responsavel: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Conselho</Label>
                    <Input
                      defaultValue={config?.conselho_tipo ?? 'CREFITO-3'}
                      placeholder="Ex: CREFITO-3"
                      onBlur={(e) => void updateConfig({ conselho_tipo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Número do Conselho</Label>
                  <Input
                    defaultValue={config?.conselho_numero ?? ''}
                    placeholder="Ex: 215954 - F SP"
                    onBlur={(e) => void updateConfig({ conselho_numero: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuração Fiscal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código TUSS padrão</Label>
                    <Input
                      defaultValue={config?.codigo_tuss ?? '04391'}
                      placeholder="Ex: 04391 ou 50000160"
                      onBlur={(e) => void updateConfig({ codigo_tuss: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Código TUSS do serviço prestado (aparece na discriminação da nota)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>% Impostos (para discriminação)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={config?.percentual_impostos?.toString() ?? '8.70'}
                      onBlur={(e) => void updateConfig({ percentual_impostos: parseFloat(e.target.value) || 8.70 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentual exibido no rodapé da discriminação (Lei 12.741/2012)
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alíquota ISS (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={config?.aliquota_iss?.toString() ?? '0'}
                      onBlur={(e) => void updateConfig({ aliquota_iss: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Código do Município</Label>
                    <Input
                      defaultValue={config?.municipio_codigo ?? '3550308'}
                      placeholder="3550308 (São Paulo)"
                      onBlur={(e) => void updateConfig({ municipio_codigo: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Emissão Automática</p>
                    <p className="text-sm text-muted-foreground">
                      Registrar NFS-e automaticamente para cada atendimento concluído
                    </p>
                  </div>
                  <Switch
                    checked={config?.auto_emissao || false}
                    onCheckedChange={(checked) => void updateConfig({ auto_emissao: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select
                    defaultValue={config?.ambiente || 'homologacao'}
                    onValueChange={(v: 'homologacao' | 'producao') => void updateConfig({ ambiente: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação (testes)</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold mb-1">
                  Portal NFS-e Prefeitura de São Paulo
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                  A emissão final da NFS-e deve ser realizada no portal da prefeitura com seu certificado digital.
                  O FisioFlow gera o texto completo da discriminação automaticamente para você copiar.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://nfe.prefeitura.sp.gov.br/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Portal SP
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ===================== DIALOG NOVA NFS-e ===================== */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetDialog(); else setIsDialogOpen(true); }}>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Nova NFS-e
              </DialogTitle>
              <DialogDescription>
                Selecione o paciente e as sessões para pré-preencher a nota automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* ---- Passo 1: Paciente ---- */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Paciente (Tomador de Serviços)
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar paciente por nome ou CPF..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      if (!e.target.value) setSelectedPatient(null);
                    }}
                    className="pl-10"
                  />
                  {filteredPatients.length > 0 && !selectedPatient && (
                    <div className="absolute z-50 w-full bg-white dark:bg-gray-900 border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {filteredPatients.map((p: PatientRow) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                          onClick={() => handleSelectPatient(p)}
                        >
                          <span className="font-medium">{p.full_name || p.name}</span>
                          {p.cpf && <span className="text-muted-foreground ml-2">— CPF: {p.cpf}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedPatient && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 text-sm">
                      <span className="font-semibold">{selectedPatient.full_name || selectedPatient.name}</span>
                      {selectedPatient.cpf && <span className="text-muted-foreground ml-2">CPF: {selectedPatient.cpf}</span>}
                      {selectedPatient.email && <span className="text-muted-foreground ml-2">— {selectedPatient.email}</span>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientSearch('');
                        setSelectedSessions(new Set());
                      }}
                    >
                      Trocar
                    </Button>
                  </div>
                )}
              </div>

              {/* ---- Passo 2: Sessões ---- */}
              {selectedPatient && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Sessões Realizadas</h3>
                    {loadingAppointments && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {!loadingAppointments && patientAppointments.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {selectedSessions.size} sessão(ões) selecionada(s)
                      </span>
                    )}
                  </div>

                  {!loadingAppointments && patientAppointments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                      Nenhuma sessão concluída encontrada para este paciente.
                    </p>
                  )}

                  {patientAppointments.length > 0 && (
                    <>
                      <div className="border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10"></TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Horário</TableHead>
                              <TableHead>Tipo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {patientAppointments.map((apt: AppointmentRow) => (
                              <TableRow
                                key={apt.id}
                                className={selectedSessions.has(apt.id) ? 'bg-blue-50 dark:bg-blue-950/20' : 'cursor-pointer hover:bg-gray-50'}
                                onClick={() => toggleSession(apt.id)}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedSessions.has(apt.id)}
                                    onCheckedChange={() => toggleSession(apt.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {apt.date ? format(new Date(apt.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                  {apt.start_time ? apt.start_time.substring(0, 5) : '-'}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {apt.session_type || 'Fisioterapia'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {selectedSessions.size > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border">
                          <div className="space-y-1 flex-1">
                            <Label className="text-xs">Valor por sessão (R$)</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">R$</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={valorPorSessao}
                                onChange={(e) => handleValorPorSessaoChange(e.target.value)}
                                className="w-32"
                              />
                              <span className="text-sm text-muted-foreground">
                                × {selectedSessions.size} sessão(ões) =
                              </span>
                              <span className="font-semibold text-primary">
                                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          {totalValue > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const desc = regenerateDescription(selectedPatient, selectedAppointments, totalValue, config);
                                setFormData((fd) => ({ ...fd, servico_descricao: desc }));
                                toast.success('Texto da discriminação regenerado!');
                              }}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Regenerar texto
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <Separator />

              {/* ---- Passo 3: Dados da NFS-e ---- */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Dados da NFS-e</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Total do Serviço *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                        required
                      />
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
                </div>

                <Separator />

                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Tomador de Serviços</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome / Razão Social *</Label>
                    <Input
                      placeholder="Nome do paciente"
                      value={formData.destinatario_nome}
                      onChange={(e) => setFormData({ ...formData, destinatario_nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF / CNPJ *</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.destinatario_cpf_cnpj}
                      onChange={(e) => setFormData({ ...formData, destinatario_cpf_cnpj: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input
                      placeholder="Endereço completo"
                      value={formData.destinatario_endereco}
                      onChange={(e) => setFormData({ ...formData, destinatario_endereco: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      placeholder="email@paciente.com"
                      value={formData.destinatario_email}
                      onChange={(e) => setFormData({ ...formData, destinatario_email: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />

                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Discriminação dos Serviços</h4>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Descreva o serviço realizado (texto auto-gerado ao selecionar sessões)..."
                    value={formData.servico_descricao}
                    onChange={(e) => setFormData({ ...formData, servico_descricao: e.target.value })}
                    rows={6}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Texto pré-preenchido automaticamente. Você pode editar livremente antes de emitir.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código CNAE</Label>
                    <Input
                      placeholder="8711500"
                      value={formData.codigo_cnae}
                      onChange={(e) => setFormData({ ...formData, codigo_cnae: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">8711500 = Fisioterapia</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Código do Serviço Municipal</Label>
                    <Input
                      placeholder="04391"
                      value={formData.codigo_tributario}
                      onChange={(e) => setFormData({ ...formData, codigo_tributario: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">04391 = Fisioterapia (SP)</p>
                  </div>
                </div>
              </div>

              {/* Info portal */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Ao clicar em <strong>Emitir NFS-e</strong>, os dados serão salvos e o portal da Prefeitura de São Paulo será aberto.
                  Copie a discriminação gerada e cole no campo correspondente do portal para finalizar a emissão com seu certificado digital.
                </span>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={resetDialog}>
                Cancelar
              </Button>
              <Button
                variant="secondary"
                disabled={createNFSe.isPending || !formData.valor}
                onClick={() => createNFSe.mutate({ ...formData, status: 'rascunho' })}
              >
                {createNFSe.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Rascunho
              </Button>
              <Button
                disabled={createNFSe.isPending || !formData.valor || !formData.servico_descricao}
                onClick={() => createNFSe.mutate({ ...formData, status: 'emitida' })}
              >
                {createNFSe.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                Emitir NFS-e (Portal SP)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===================== PREVIEW DIALOG ===================== */}
        {previewNFSe && (
          <Dialog open={!!previewNFSe} onOpenChange={() => setPreviewNFSe(null)}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Visualização de NFS-e</DialogTitle>
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
