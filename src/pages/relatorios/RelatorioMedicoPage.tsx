import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PatientCombobox } from '@/components/ui/patient-combobox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText, Stethoscope, Edit, Eye,
  Activity, CheckCircle2, PenTool,
  Bone, Heart, TrendingUp, Save,
  Plus, Copy, Trash2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, query as firestoreQuery, where, getDocs, addDoc, setDoc, doc, getDoc, orderBy as firestoreOrderBy, deleteDoc } from '@/integrations/firebase/app';
import { useOrganizations } from '@/hooks/useOrganizations';
import { usePatients } from '@/hooks/usePatients';
import { patientsApi } from '@/integrations/firebase/functions';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Info } from 'lucide-react';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #333',
    paddingBottom: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 9,
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    padding: '6 10',
    marginBottom: 10,
    marginTop: 5,
  },
  row: {
    flexDirection: 'row' as const,
    marginBottom: 5,
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
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    padding: 5,
  },
  tableCell: {
    flex: 1,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  signature: {
    marginTop: 30,
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
  },
  signatureLine: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 10,
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
    fontSize: 8,
    textAlign: 'center',
    color: '#666',
  },
});

const TEMPLATE_FIELD_OPTIONS = [
  { id: 'queixa_principal', label: 'Queixa principal' },
  { id: 'historico_doencas_atuais', label: 'Histórico de doenças atuais' },
  { id: 'medicamentos_em_uso', label: 'Medicamentos em uso' },
  { id: 'alergias', label: 'Alergias' },
  { id: 'cirurgias_previas', label: 'Cirurgias prévias' },
  { id: 'inspecao_visual', label: 'Inspeção visual' },
  { id: 'palpacao', label: 'Palpação' },
  { id: 'goniometria', label: 'Goniometria' },
  { id: 'forca_muscular', label: 'Força muscular' },
  { id: 'reflexos', label: 'Reflexos' },
  { id: 'sensibilidade', label: 'Sensibilidade' },
  { id: 'teste_funcional', label: 'Teste funcional' },
  { id: 'diagnostico_fisioterapeutico', label: 'Diagnóstico fisioterapêutico' },
  { id: 'codigos_cid', label: 'Códigos CID' },
  { id: 'objetivos', label: 'Objetivos do tratamento' },
  { id: 'procedimentos', label: 'Procedimentos' },
  { id: 'equipamentos_utilizados', label: 'Equipamentos utilizados' },
  { id: 'frequencia', label: 'Frequência' },
  { id: 'duracao_prevista', label: 'Duração prevista' },
  { id: 'evolucoes', label: 'Evoluções' },
  { id: 'resumo_tratamento', label: 'Resumo do tratamento' },
  { id: 'conduta_sugerida', label: 'Conduta sugerida' },
  { id: 'recomendacoes', label: 'Recomendações' },
];

interface DadosPaciente {
  nome: string;
  cpf?: string;
  data_nascimento?: string;
  idade?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
}

interface DadosProfissionalEmissor {
  nome: string;
  registro: string;
  uf_registro?: string;
  especialidade: string;
  email?: string;
  telefone?: string;
}

interface DadosProfissionalDestino {
  nome?: string;
  especialidade?: string;
  instituicao?: string;
  email?: string;
  telefone?: string;
}

interface HistoricoClinico {
  queixa_principal?: string;
  historico_doencas_atuais?: string;
  historico_familiar?: string;
  medicamentos_em_uso?: string;
  alergias?: string;
  cirurgias_previas?: string;
}

interface AvaliacaoFisioterapeutica {
  data_avaliacao?: string;
  inspecao_visual?: string;
  palpacao?: string;
  goniometria?: string;
  forca_muscular?: string;
  reflexos?: string;
  sensibilidade?: string;
  teste_funcional?: string;
  diagnostico_fisioterapeutico?: string;
  codigos_cid?: string[];
}

interface PlanoTratamento {
  objetivos?: string;
  procedimentos?: string[];
  frequencia?: string;
  duracao_prevista?: string;
  equipamentos_utilizados?: string[];
}

interface Evolucao {
  data: string;
  sessao: number;
  descricao: string;
  resposta_paciente?: string;
  ajustes_realizados?: string;
}

interface RelatorioTemplate {
  id: string;
  nome: string;
  descricao: string;
  tipo_relatorio: RelatorioMedicoData['tipo_relatorio'];
  campos: string[];
  organization_id?: string | null;
  created_at: string;
  updated_at: string;
}

const BUILTIN_TEMPLATES: RelatorioTemplate[] = [
  {
    id: 'builtin-avaliacao-inicial',
    nome: 'Avaliação Inicial Completa',
    descricao: 'Relatório completo de avaliação inicial para enviar ao médico',
    tipo_relatorio: 'inicial',
    campos: ['queixa_principal', 'historico_doencas_atuais', 'medicamentos_em_uso', 'alergias', 'inspecao_visual', 'palpacao', 'goniometria', 'forca_muscular', 'teste_funcional', 'diagnostico_fisioterapeutico', 'codigos_cid', 'objetivos', 'procedimentos', 'frequencia', 'duracao_prevista'],
    organization_id: '__builtin__',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-evolucao-mensal',
    nome: 'Evolução Mensal',
    descricao: 'Atualização mensal da evolução do paciente para o médico assistente',
    tipo_relatorio: 'evolucao',
    campos: ['evolucoes', 'resumo_tratamento', 'conduta_sugerida', 'recomendacoes'],
    organization_id: '__builtin__',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-alta-medica',
    nome: 'Relatório de Alta',
    descricao: 'Documento de alta com resumo do tratamento e recomendações finais',
    tipo_relatorio: 'alta',
    campos: ['resumo_tratamento', 'conduta_sugerida', 'recomendacoes'],
    organization_id: '__builtin__',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-interconsulta',
    nome: 'Solicitação de Interconsulta',
    descricao: 'Pedido de avaliação com especialista com queixa e conduta sugerida',
    tipo_relatorio: 'interconsulta',
    campos: ['queixa_principal', 'historico_doencas_atuais', 'conduta_sugerida'],
    organization_id: '__builtin__',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-pos-operatorio',
    nome: 'Pós-Operatório',
    descricao: 'Acompanhamento de reabilitação pós-cirúrgica com foco em evolução',
    tipo_relatorio: 'cirurgico',
    campos: ['inspecao_visual', 'palpacao', 'goniometria', 'forca_muscular', 'teste_funcional', 'evolucoes', 'resumo_tratamento', 'conduta_sugerida'],
    organization_id: '__builtin__',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
];

interface RelatorioTemplate {
  id: string;
  nome: string;
  descricao: string;
  tipo_relatorio: RelatorioMedicoData['tipo_relatorio'];
  campos: string[];
  organization_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface RelatorioMedicoData {
  id: string;
  tipo_relatorio: 'inicial' | 'evolucao' | 'alta' | 'interconsulta' | 'cirurgico';
  paciente: DadosPaciente;
  profissional_emissor: DadosProfissionalEmissor;
  profissional_destino: DadosProfissionalDestino;
  clinica: {
    nome: string;
    cnpj?: string;
    endereco?: string;
    telefone?: string;
  };
  historico_clinico?: HistoricoClinico;
  avaliacao?: AvaliacaoFisioterapeutica;
  plano_tratamento?: PlanoTratamento;
  evolucoes?: Evolucao[];
  resumo_tratamento?: string;
  conduta_sugerida?: string;
  recomendacoes?: string;
  data_emissao: string;
  urgencia?: 'baixa' | 'media' | 'alta';
  /** ID do paciente (para atualizar relatório feito/enviado no cadastro) */
  patientId?: string;
  /** Controle: relatório já foi feito / já foi enviado (persistido no paciente) */
  relatorio_feito?: boolean;
  relatorio_enviado?: boolean;
}

// Componente PDF do Relatório Médico
function RelatorioMedicoPDF({ data }: { data: RelatorioMedicoData }) {
  const getTipoLabel = () => {
    switch (data.tipo_relatorio) {
      case 'inicial': return 'RELATÓRIO DE AVALIAÇÃO INICIAL';
      case 'evolucao': return 'RELATÓRIO DE EVOLUÇÃO';
      case 'alta': return 'RELATÓRIO DE ALTA FISIOTERAPÊUTICA';
      case 'interconsulta': return 'SOLICITAÇÃO DE INTERCONSULTA';
      case 'cirurgico': return 'RELATÓRIO PRÉ/PÓS-OPERATÓRIO';
      default: return 'RELATÓRIO FISIOTERAPÊUTICO';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{getTipoLabel()}</Text>
          <Text style={styles.subtitle}>
            Comunicação entre profissionais de saúde
          </Text>
          <Text style={styles.subtitle}>
            Data de emissão: {format(new Date(data.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
            {data.urgencia && ` - Urgência: ${data.urgencia.toUpperCase()}`}
          </Text>
        </View>

        {/* Dados da Clínica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLÍNICA DE ORIGEM</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome:</Text>
            <Text style={styles.value}>{data.clinica.nome}</Text>
          </View>
          {data.clinica.endereco && (
            <View style={styles.row}>
              <Text style={styles.label}>Endereço:</Text>
              <Text style={styles.value}>{data.clinica.endereco}</Text>
            </View>
          )}
          {data.clinica.telefone && (
            <View style={styles.row}>
              <Text style={styles.label}>Telefone:</Text>
              <Text style={styles.value}>{data.clinica.telefone}</Text>
            </View>
          )}
        </View>

        {/* Profissional Emissor */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROFISSIONAL EMISSOR</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome:</Text>
            <Text style={styles.value}>{data.profissional_emissor.nome}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Registro:</Text>
            <Text style={styles.value}>
              {data.profissional_emissor.registro}
              {data.profissional_emissor.uf_registro && `/${data.profissional_emissor.uf_registro}`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Especialidade:</Text>
            <Text style={styles.value}>{data.profissional_emissor.especialidade}</Text>
          </View>
        </View>

        {/* Profissional Destino */}
        {data.profissional_destino?.nome && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROFISSIONAL DESTINATÁRIO</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Nome:</Text>
              <Text style={styles.value}>{data.profissional_destino.nome}</Text>
            </View>
            {data.profissional_destino.especialidade && (
              <View style={styles.row}>
                <Text style={styles.label}>Especialidade:</Text>
                <Text style={styles.value}>{data.profissional_destino.especialidade}</Text>
              </View>
            )}
            {data.profissional_destino.instituicao && (
              <View style={styles.row}>
                <Text style={styles.label}>Instituição:</Text>
                <Text style={styles.value}>{data.profissional_destino.instituicao}</Text>
              </View>
            )}
            {data.profissional_destino.telefone && (
              <View style={styles.row}>
                <Text style={styles.label}>Telefone:</Text>
                <Text style={styles.value}>{data.profissional_destino.telefone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Dados do Paciente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS DO PACIENTE</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome Completo:</Text>
            <Text style={styles.value}>{data.paciente.nome}</Text>
          </View>
          {data.paciente.cpf && (
            <View style={styles.row}>
              <Text style={styles.label}>CPF:</Text>
              <Text style={styles.value}>{data.paciente.cpf}</Text>
            </View>
          )}
          {data.paciente.data_nascimento && (
            <View style={styles.row}>
              <Text style={styles.label}>Data Nasc.:</Text>
              <Text style={styles.value}>
                {format(new Date(data.paciente.data_nascimento), 'dd/MM/yyyy', { locale: ptBR })}
                {data.paciente.idade && ` (${data.paciente.idade})`}
              </Text>
            </View>
          )}
          {data.paciente.telefone && (
            <View style={styles.row}>
              <Text style={styles.label}>Telefone:</Text>
              <Text style={styles.value}>{data.paciente.telefone}</Text>
            </View>
          )}
        </View>

        {/* Histórico Clínico */}
        {data.historico_clinico && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HISTÓRICO CLÍNICO</Text>
            {data.historico_clinico.queixa_principal && (
              <View style={styles.row}>
                <Text style={styles.label}>Queixa Principal:</Text>
                <Text style={styles.value}>{data.historico_clinico.queixa_principal}</Text>
              </View>
            )}
            {data.historico_clinico.historico_doencas_atuais && (
              <View style={styles.row}>
                <Text style={styles.label}>Doenças Atuais:</Text>
                <Text style={styles.value}>{data.historico_clinico.historico_doencas_atuais}</Text>
              </View>
            )}
            {data.historico_clinico.medicamentos_em_uso && (
              <View style={styles.row}>
                <Text style={styles.label}>Medicamentos:</Text>
                <Text style={styles.value}>{data.historico_clinico.medicamentos_em_uso}</Text>
              </View>
            )}
            {data.historico_clinico.alergias && (
              <View style={styles.row}>
                <Text style={styles.label}>Alergias:</Text>
                <Text style={styles.value}>{data.historico_clinico.alergias}</Text>
              </View>
            )}
            {data.historico_clinico.cirurgias_previas && (
              <View style={styles.row}>
                <Text style={styles.label}>Cirurgias Prévias:</Text>
                <Text style={styles.value}>{data.historico_clinico.cirurgias_previas}</Text>
              </View>
            )}
          </View>
        )}

        {/* Avaliação Fisioterapêutica */}
        {data.avaliacao && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AVALIAÇÃO FISIOTERAPÊUTICA</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Data:</Text>
              <Text style={styles.value}>
                {format(new Date(data.avaliacao.data_avaliacao), 'dd/MM/yyyy', { locale: ptBR })}
              </Text>
            </View>
            {data.avaliacao.inspecao_visual && (
              <View style={styles.row}>
                <Text style={styles.label}>Inspeção Visual:</Text>
                <Text style={styles.value}>{data.avaliacao.inspecao_visual}</Text>
              </View>
            )}
            {data.avaliacao.palpacao && (
              <View style={styles.row}>
                <Text style={styles.label}>Palpação:</Text>
                <Text style={styles.value}>{data.avaliacao.palpacao}</Text>
              </View>
            )}
            {data.avaliacao.goniometria && (
              <View style={styles.row}>
                <Text style={styles.label}>Goniometria:</Text>
                <Text style={styles.value}>{data.avaliacao.goniometria}</Text>
              </View>
            )}
            {data.avaliacao.forca_muscular && (
              <View style={styles.row}>
                <Text style={styles.label}>Força Muscular:</Text>
                <Text style={styles.value}>{data.avaliacao.forca_muscular}</Text>
              </View>
            )}
            {data.avaliacao.teste_funcional && (
              <View style={styles.row}>
                <Text style={styles.label}>Teste Funcional:</Text>
                <Text style={styles.value}>{data.avaliacao.teste_funcional}</Text>
              </View>
            )}
            {data.avaliacao.diagnostico_fisioterapeutico && (
              <View style={styles.row}>
                <Text style={styles.label}>Diagnóstico Fisioterapêutico:</Text>
                <Text style={styles.value}>{data.avaliacao.diagnostico_fisioterapeutico}</Text>
              </View>
            )}
            {data.avaliacao.codigos_cid && data.avaliacao.codigos_cid.length > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>CIDs:</Text>
                <Text style={styles.value}>{data.avaliacao.codigos_cid.join(', ')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Plano de Tratamento */}
        {data.plano_tratamento && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PLANO DE TRATAMENTO</Text>
            {data.plano_tratamento.objetivos && (
              <View style={styles.row}>
                <Text style={styles.label}>Objetivos:</Text>
                <Text style={styles.value}>{data.plano_tratamento.objetivos}</Text>
              </View>
            )}
            {data.plano_tratamento.procedimentos && data.plano_tratamento.procedimentos.length > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Procedimentos:</Text>
                <Text style={styles.value}>{data.plano_tratamento.procedimentos.join(', ')}</Text>
              </View>
            )}
            {data.plano_tratamento.frequencia && (
              <View style={styles.row}>
                <Text style={styles.label}>Frequência:</Text>
                <Text style={styles.value}>{data.plano_tratamento.frequencia}</Text>
              </View>
            )}
            {data.plano_tratamento.duracao_prevista && (
              <View style={styles.row}>
                <Text style={styles.label}>Duração Prevista:</Text>
                <Text style={styles.value}>{data.plano_tratamento.duracao_prevista}</Text>
              </View>
            )}
          </View>
        )}

        {/* Evoluções */}
        {data.evolucoes && data.evolucoes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EVOLUÇÕES</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCell}>Sessão</Text>
                <Text style={styles.tableCell}>Data</Text>
                <Text style={styles.tableCell}>Descrição</Text>
              </View>
              {data.evolucoes.map((evolucao, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{evolucao.sessao}</Text>
                  <Text style={styles.tableCell}>
                    {format(new Date(evolucao.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </Text>
                  <Text style={styles.tableCell}>{evolucao.descricao}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Resumo do Tratamento */}
        {data.resumo_tratamento && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RESUMO DO TRATAMENTO</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>
              {data.resumo_tratamento}
            </Text>
          </View>
        )}

        {/* Conduta Sugerida */}
        {data.conduta_sugerida && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONDUTA SUGERIDA</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>
              {data.conduta_sugerida}
            </Text>
          </View>
        )}

        {/* Recomendações */}
        {data.recomendacoes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECOMENDAÇÕES</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>
              {data.recomendacoes}
            </Text>
          </View>
        )}

        {/* Assinatura */}
        <View style={styles.signature}>
          <View style={styles.signatureLine}>
            <Text>_________________________________________</Text>
            <Text style={{ fontSize: 8 }}>Assinatura do Fisioterapeuta</Text>
            <Text style={{ fontSize: 8 }}>{data.profissional_emissor.nome}</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text>_________________________________________</Text>
            <Text style={{ fontSize: 8 }}>Carimbo</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Text>
          <Text>
            Este relatório contém informações confidenciais protegidas por sigilo profissional.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// Componente de Editor do Relatório
function RelatorioMedicoEditor({
  data,
  onChange,
  onSave,
  onCancel
}: {
  data: RelatorioMedicoData;
  onChange: (data: RelatorioMedicoData) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <ScrollArea className="h-[70vh] pr-4">
      <div className="space-y-6">
        {/* Tipo de Relatório e Urgência */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipo de Relatório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={data.tipo_relatorio}
                  onValueChange={(v) => onChange({ ...data, tipo_relatorio: v as 'inicial' | 'evolucao' | 'alta' | 'interconsulta' | 'cirurgico' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inicial">Avaliação Inicial</SelectItem>
                    <SelectItem value="evolucao">Evolução</SelectItem>
                    <SelectItem value="alta">Alta Fisioterapêutica</SelectItem>
                    <SelectItem value="interconsulta">Interconsulta</SelectItem>
                    <SelectItem value="cirurgico">Pré/Pós-Operatório</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urgência</Label>
                <Select
                  value={data.urgencia || 'baixa'}
                  onValueChange={(v) => onChange({ ...data, urgencia: v as 'baixa' | 'media' | 'alta' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados do Paciente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={data.paciente.nome}
                  onChange={(e) => onChange({
                    ...data,
                    paciente: { ...data.paciente, nome: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={data.paciente.cpf || ''}
                  onChange={(e) => onChange({
                    ...data,
                    paciente: { ...data.paciente, cpf: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={data.paciente.data_nascimento || ''}
                  onChange={(e) => onChange({
                    ...data,
                    paciente: { ...data.paciente, data_nascimento: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Idade</Label>
                <Input
                  placeholder="Ex: 35 anos"
                  value={data.paciente.idade || ''}
                  onChange={(e) => onChange({
                    ...data,
                    paciente: { ...data.paciente, idade: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={data.paciente.telefone || ''}
                  onChange={(e) => onChange({
                    ...data,
                    paciente: { ...data.paciente, telefone: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="paciente@email.com"
                  value={data.paciente.email || ''}
                  onChange={(e) => onChange({
                    ...data,
                    paciente: { ...data.paciente, email: e.target.value }
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profissional Destino */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Profissional Destinatário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Médico/Especialista</Label>
                <Input
                  placeholder="Dr(a). Nome Sobrenome"
                  value={data.profissional_destino?.nome || ''}
                  onChange={(e) => onChange({
                    ...data,
                    profissional_destino: {
                      ...data.profissional_destino,
                      nome: e.target.value
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Input
                  placeholder="Ex: Ortopedia, Neurologia"
                  value={data.profissional_destino?.especialidade || ''}
                  onChange={(e) => onChange({
                    ...data,
                    profissional_destino: {
                      ...data.profissional_destino,
                      especialidade: e.target.value
                    }
                  })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Instituição/Hospital</Label>
                <Input
                  placeholder="Nome da instituição"
                  value={data.profissional_destino?.instituicao || ''}
                  onChange={(e) => onChange({
                    ...data,
                    profissional_destino: {
                      ...data.profissional_destino,
                      instituicao: e.target.value
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone do Médico</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={data.profissional_destino?.telefone || ''}
                  onChange={(e) => onChange({
                    ...data,
                    profissional_destino: {
                      ...data.profissional_destino,
                      telefone: e.target.value
                    }
                  })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email do Destinatário</Label>
                <Input
                  type="email"
                  placeholder="medico@hospital.com"
                  value={data.profissional_destino?.email || ''}
                  onChange={(e) => onChange({
                    ...data,
                    profissional_destino: {
                      ...data.profissional_destino,
                      email: e.target.value
                    }
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controle do relatório (relatório feito / enviado - fica no paciente) */}
        {data.patientId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Controle do relatório</CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Marque quando o relatório for feito e quando for enviado ao médico. Os dados ficam vinculados ao paciente.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={data.relatorio_feito ?? false}
                    onCheckedChange={(checked) => onChange({
                      ...data,
                      relatorio_feito: !!checked
                    })}
                  />
                  <span className="text-sm">Relatório feito</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={data.relatorio_enviado ?? false}
                    onCheckedChange={(checked) => onChange({
                      ...data,
                      relatorio_enviado: !!checked
                    })}
                  />
                  <span className="text-sm">Relatório enviado ao médico</span>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico Clínico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Histórico Clínico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Queixa Principal</Label>
              <Textarea
                placeholder="Descreva a queixa principal do paciente..."
                value={data.historico_clinico?.queixa_principal || ''}
                onChange={(e) => onChange({
                  ...data,
                  historico_clinico: {
                    ...data.historico_clinico,
                    queixa_principal: e.target.value
                  }
                })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Histórico de Doenças Atuais</Label>
              <Textarea
                placeholder="Doenças e condições atuais..."
                value={data.historico_clinico?.historico_doencas_atuais || ''}
                onChange={(e) => onChange({
                  ...data,
                  historico_clinico: {
                    ...data.historico_clinico,
                    historico_doencas_atuais: e.target.value
                  }
                })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Medicamentos em Uso</Label>
                <Textarea
                  placeholder="Liste os medicamentos..."
                  value={data.historico_clinico?.medicamentos_em_uso || ''}
                  onChange={(e) => onChange({
                    ...data,
                    historico_clinico: {
                      ...data.historico_clinico,
                      medicamentos_em_uso: e.target.value
                    }
                  })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Alergias</Label>
                <Textarea
                  placeholder="Alergias conhecidas..."
                  value={data.historico_clinico?.alergias || ''}
                  onChange={(e) => onChange({
                    ...data,
                    historico_clinico: {
                      ...data.historico_clinico,
                      alergias: e.target.value
                    }
                  })}
                  rows={2}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cirurgias Prévias</Label>
              <Textarea
                placeholder="Cirurgias anteriores relevantes..."
                value={data.historico_clinico?.cirurgias_previas || ''}
                onChange={(e) => onChange({
                  ...data,
                  historico_clinico: {
                    ...data.historico_clinico,
                    cirurgias_previas: e.target.value
                  }
                })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Avaliação Fisioterapêutica */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Avaliação Fisioterapêutica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Avaliação</Label>
                <Input
                  type="date"
                  value={data.avaliacao?.data_avaliacao || ''}
                  onChange={(e) => onChange({
                    ...data,
                    avaliacao: { ...data.avaliacao, data_avaliacao: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>CIDs (separados por vírgula)</Label>
                <Input
                  placeholder="Ex: M54.5, M75.4"
                  value={data.avaliacao?.codigos_cid?.join(', ') || ''}
                  onChange={(e) => onChange({
                    ...data,
                    avaliacao: {
                      ...data.avaliacao,
                      codigos_cid: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Inspeção Visual</Label>
              <Textarea
                placeholder="Observações visuais (postura, assimetrias, edema, cicatrizes...)"
                value={data.avaliacao?.inspecao_visual || ''}
                onChange={(e) => onChange({
                  ...data,
                  avaliacao: { ...data.avaliacao, inspecao_visual: e.target.value }
                })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Palpação</Label>
              <Textarea
                placeholder="Findings à palpação (pontos dolorosos, tônus muscular, temperatura...)"
                value={data.avaliacao?.palpacao || ''}
                onChange={(e) => onChange({
                  ...data,
                  avaliacao: { ...data.avaliacao, palpacao: e.target.value }
                })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goniometria (ADM)</Label>
                <Textarea
                  placeholder="Amplitudes de movimento encontradas..."
                  value={data.avaliacao?.goniometria || ''}
                  onChange={(e) => onChange({
                    ...data,
                    avaliacao: { ...data.avaliacao, goniometria: e.target.value }
                  })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Força Muscular</Label>
                <Textarea
                  placeholder="Testes de força (escala de Oxford/LOF...)"
                  value={data.avaliacao?.forca_muscular || ''}
                  onChange={(e) => onChange({
                    ...data,
                    avaliacao: { ...data.avaliacao, forca_muscular: e.target.value }
                  })}
                  rows={2}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Teste Funcional</Label>
              <Textarea
                placeholder="Testes funcionais realizados e resultados..."
                value={data.avaliacao?.teste_funcional || ''}
                onChange={(e) => onChange({
                  ...data,
                  avaliacao: { ...data.avaliacao, teste_funcional: e.target.value }
                })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Diagnóstico Fisioterapêutico</Label>
              <Textarea
                placeholder="Diagnóstico funcional do fisioterapeuta..."
                value={data.avaliacao?.diagnostico_fisioterapeutico || ''}
                onChange={(e) => onChange({
                  ...data,
                  avaliacao: { ...data.avaliacao, diagnostico_fisioterapeutico: e.target.value }
                })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Plano de Tratamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plano de Tratamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Objetivos do Tratamento</Label>
              <Textarea
                placeholder="Objetivos terapêuticos..."
                value={data.plano_tratamento?.objetivos || ''}
                onChange={(e) => onChange({
                  ...data,
                  plano_tratamento: { ...data.plano_tratamento, objetivos: e.target.value }
                })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Procedimentos (separados por vírgula)</Label>
                <Textarea
                  placeholder="Ex: Cinesioterapia, Fisioterapia manual, RPG"
                  value={data.plano_tratamento?.procedimentos?.join(', ') || ''}
                  onChange={(e) => onChange({
                    ...data,
                    plano_tratamento: {
                      ...data.plano_tratamento,
                      procedimentos: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Equipamentos Utilizados</Label>
                <Textarea
                  placeholder="Ex: TENS, Ultrassom, Mesa de flexão"
                  value={data.plano_tratamento?.equipamentos_utilizados?.join(', ') || ''}
                  onChange={(e) => onChange({
                    ...data,
                    plano_tratamento: {
                      ...data.plano_tratamento,
                      equipamentos_utilizados: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  })}
                  rows={2}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Input
                  placeholder="Ex: 3x por semana"
                  value={data.plano_tratamento?.frequencia || ''}
                  onChange={(e) => onChange({
                    ...data,
                    plano_tratamento: { ...data.plano_tratamento, frequencia: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duração Prevista</Label>
                <Input
                  placeholder="Ex: 4 semanas"
                  value={data.plano_tratamento?.duracao_prevista || ''}
                  onChange={(e) => onChange({
                    ...data,
                    plano_tratamento: { ...data.plano_tratamento, duracao_prevista: e.target.value }
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo e Conduta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo e Conduta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Resumo do Tratamento</Label>
              <Textarea
                placeholder="Resumo geral do tratamento realizado..."
                value={data.resumo_tratamento || ''}
                onChange={(e) => onChange({ ...data, resumo_tratamento: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Conduta Sugerida</Label>
              <Textarea
                placeholder="Conductas sugeridas ao médico destinatário..."
                value={data.conduta_sugerida || ''}
                onChange={(e) => onChange({ ...data, conduta_sugerida: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Recomendações</Label>
              <Textarea
                placeholder="Recomendações adicionais..."
                value={data.recomendacoes || ''}
                onChange={(e) => onChange({ ...data, recomendacoes: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Relatório
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

export default function RelatorioMedicoPage() {
  const { user } = useAuth();
  const { currentOrganization: org } = useOrganizations();
  const queryClient = useQueryClient();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [previewRelatorio, setPreviewRelatorio] = useState<RelatorioMedicoData | null>(null);
  const [editingRelatorio, setEditingRelatorio] = useState<RelatorioMedicoData | null>(null);
  const [activeTab, setActiveTab] = useState<'criar' | 'lista'>('criar');
  const location = useLocation();
  const statePatientId = (location.state as { patientId?: string } | null)?.patientId;
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const buildEmptyTemplate = (): RelatorioTemplate => ({
    id: '',
    nome: 'Novo modelo',
    descricao: '',
    tipo_relatorio: 'inicial',
    campos: ['queixa_principal', 'resumo_tratamento', 'conduta_sugerida'],
    organization_id: org?.id ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RelatorioTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<RelatorioTemplate>(buildEmptyTemplate);

  useEffect(() => {
    setTemplateForm(prev => ({ ...prev, organization_id: org?.id ?? null }));
  }, [org?.id]);

  const { data: customTemplates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['relatorio-medico-templates', org?.id],
    queryFn: async () => {
      const constraints = [firestoreOrderBy('created_at', 'desc')];
      if (org?.id) constraints.unshift(where('organization_id', '==', org.id));
      const q = firestoreQuery(collection(db, 'relatorios_medicos_modelos'), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as RelatorioTemplate[];
    },
  });

  const templates = [...BUILTIN_TEMPLATES, ...customTemplates];

  // Buscar relatórios salvos
  const { data: relatorios = [], isLoading } = useQuery({
    queryKey: ['relatorios-medicos'],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'relatorios_medicos'),
        firestoreOrderBy('data_emissao', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as RelatorioMedicoData[];
    },
  });

  const { data: pacientes = [] } = usePatients();

  // Abrir relatório para o paciente quando vier do dashboard/evolução
  useEffect(() => {
    if (statePatientId && pacientes.length > 0) {
      setSelectedPatientId(statePatientId);
      criarRelatorioPaciente(statePatientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statePatientId, pacientes.length]);

  // Salvar relatório
  const saveRelatorio = useMutation({
    mutationFn: async (data: RelatorioMedicoData) => {
      if (data.id) {
        const docRef = doc(db, 'relatorios_medicos', data.id);
        await setDoc(docRef, data, { merge: true });
      } else {
        const { _id, ...rest } = data;
        const docRef = await addDoc(collection(db, 'relatorios_medicos'), rest);
        (data as RelatorioMedicoData & { id: string }).id = docRef.id;
      }
      // Atualizar paciente: médico/telefone, relatório feito / enviado (para dashboard e evolução)
      if (data.patientId) {
        await patientsApi.update(data.patientId, {
          referring_doctor_name: data.profissional_destino?.nome ?? undefined,
          referring_doctor_phone: data.profissional_destino?.telefone ?? undefined,
          medical_report_done: data.relatorio_feito ?? false,
          medical_report_sent: data.relatorio_enviado ?? false,
        });
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['relatorios-medicos'] });
      if (data.patientId) {
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        queryClient.invalidateQueries({ queryKey: ['patient', data.patientId] });
      }
      toast.success('Relatório salvo com sucesso!');
      setIsEditorOpen(false);
      setEditingRelatorio(null);
    },
    onError: () => toast.error('Erro ao salvar relatório'),
  });

  const deleteRelatorio = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'relatorios_medicos', id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorios-medicos'] });
      toast.success('Relatório excluído');
    },
    onError: () => toast.error('Erro ao excluir relatório'),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (template: RelatorioTemplate) => {
      const payload = {
        nome: template.nome,
        descricao: template.descricao,
        tipo_relatorio: template.tipo_relatorio,
        campos: template.campos,
        organization_id: template.organization_id ?? org?.id ?? null,
        created_at: template.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (template.id && !template.id.startsWith('builtin-')) {
        const ref = doc(db, 'relatorios_medicos_modelos', template.id);
        await setDoc(ref, payload, { merge: true });
        return { ...template, ...payload };
      }

      const ref = await addDoc(collection(db, 'relatorios_medicos_modelos'), payload);
      return { ...template, ...payload, id: ref.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorio-medico-templates', org?.id] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      toast.success('Modelo salvo');
    },
    onError: () => toast.error('Erro ao salvar modelo'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'relatorios_medicos_modelos', id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorio-medico-templates', org?.id] });
      toast.success('Modelo removido');
    },
    onError: () => toast.error('Erro ao remover modelo'),
  });

  // Carregar dados do profissional
  const carregarDadosProfissional = async () => {
    if (!user) return { profile: null, org: null };
    const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
    const profile = profileDoc.exists() ? profileDoc.data() : null;

    return { profile, org };
  };

  // Criar relatório a partir de paciente
  const criarRelatorioPaciente = async (pacienteId: string, options?: { openEditor?: boolean }) => {
    const paciente = pacientes.find((p) => p.id === pacienteId);
    if (!paciente) return;

    const { profile, org } = await carregarDadosProfissional();

    // Buscar evoluções do paciente
    const qEvolucoes = firestoreQuery(
      collection(db, 'evolucoes'),
      where('patient_id', '==', pacienteId),
      firestoreOrderBy('data', 'asc')
    );
    const snapshotEvolucoes = await getDocs(qEvolucoes);
    const evolucoes = snapshotEvolucoes.docs.map(d => d.data());

    const doctorName = (paciente.referring_doctor_name ?? paciente.referringDoctorName) as string | undefined;
    const doctorPhone = (paciente.referring_doctor_phone ?? paciente.referringDoctorPhone) as string | undefined;

    const relatorio: RelatorioMedicoData = {
      id: '',
      tipo_relatorio: 'inicial',
      paciente: {
        nome: (paciente.full_name ?? paciente.name) as string,
        cpf: (paciente.cpf ?? '') as string,
        data_nascimento: (paciente.birth_date ?? '') as string,
        telefone: ((paciente as any).telefone ?? (paciente as any).phone ?? '') as string,
        email: (paciente.email ?? '') as string,
      },
      profissional_emissor: {
        nome: profile?.full_name || '',
        registro: profile?.registro_profissional || '',
        uf_registro: profile?.uf_registro || '',
        especialidade: 'Fisioterapia',
        email: profile?.email || '',
        telefone: profile?.phone || '',
      },
      profissional_destino: (doctorName || doctorPhone) ? { nome: doctorName, telefone: doctorPhone } : {},
      clinica: {
        nome: org?.name || '',
        cnpj: org?.cnpj || '',
        endereco: org?.address || '',
        telefone: org?.phone || '',
      },
      evolucoes: evolucoes?.map((e, i) => ({
        data: e.data,
        sessao: i + 1,
        descricao: e.descricao || '',
      })) || [],
      data_emissao: new Date().toISOString(),
      urgencia: 'baixa',
      patientId: pacienteId,
      relatorio_feito: (paciente.medical_report_done ?? paciente.medicalReportDone) as boolean | undefined,
      relatorio_enviado: (paciente.medical_report_sent ?? paciente.medicalReportSent) as boolean | undefined,
    };

    setEditingRelatorio(relatorio);
    if (options?.openEditor !== false) {
      setIsEditorOpen(true);
    }

    return relatorio;
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    if (patientId) {
      criarRelatorioPaciente(patientId);
    }
  };

  const handleSave = () => {
    if (editingRelatorio) {
      saveRelatorio.mutate(editingRelatorio);
    }
  };

  const handleCancel = () => {
    setIsEditorOpen(false);
    setEditingRelatorio(null);
  };

  const templateIcon = (tipo: RelatorioMedicoData['tipo_relatorio']) => {
    switch (tipo) {
      case 'inicial': return <Activity className="h-6 w-6 text-blue-500" />;
      case 'evolucao': return <TrendingUp className="h-6 w-6 text-green-500" />;
      case 'alta': return <CheckCircle2 className="h-6 w-6 text-purple-500" />;
      case 'interconsulta': return <Stethoscope className="h-6 w-6 text-orange-500" />;
      case 'cirurgico': return <Bone className="h-6 w-6 text-red-500" />;
      default: return <FileText className="h-6 w-6 text-primary" />;
    }
  };

  const cloneRelatorio = (r: RelatorioMedicoData): RelatorioMedicoData => ({
    ...r,
    paciente: { ...r.paciente },
    profissional_emissor: { ...r.profissional_emissor },
    profissional_destino: { ...r.profissional_destino },
    clinica: { ...r.clinica },
    historico_clinico: r.historico_clinico ? { ...r.historico_clinico } : undefined,
    avaliacao: r.avaliacao
      ? {
          ...r.avaliacao,
          codigos_cid: r.avaliacao.codigos_cid ? [...r.avaliacao.codigos_cid] : [],
        }
      : undefined,
    plano_tratamento: r.plano_tratamento
      ? {
          ...r.plano_tratamento,
          procedimentos: r.plano_tratamento.procedimentos ? [...r.plano_tratamento.procedimentos] : [],
          equipamentos_utilizados: r.plano_tratamento.equipamentos_utilizados ? [...r.plano_tratamento.equipamentos_utilizados] : [],
        }
      : undefined,
    evolucoes: r.evolucoes ? [...r.evolucoes] : undefined,
  });

  const ensureField = (draft: RelatorioMedicoData, field: string) => {
    switch (field) {
      case 'queixa_principal':
      case 'historico_doencas_atuais':
      case 'medicamentos_em_uso':
      case 'alergias':
      case 'cirurgias_previas': {
        const historico = draft.historico_clinico ? { ...draft.historico_clinico } : {};
        (historico as any)[field] = (historico as any)[field] ?? '';
        draft.historico_clinico = historico;
        break;
      }
      case 'inspecao_visual':
      case 'palpacao':
      case 'goniometria':
      case 'forca_muscular':
      case 'reflexos':
      case 'sensibilidade':
      case 'teste_funcional':
      case 'diagnostico_fisioterapeutico': {
        const avaliacao = draft.avaliacao ? { ...draft.avaliacao } : {};
        (avaliacao as any)[field] = (avaliacao as any)[field] ?? '';
        draft.avaliacao = avaliacao;
        break;
      }
      case 'codigos_cid': {
        const avaliacao = draft.avaliacao ? { ...draft.avaliacao } : {};
        avaliacao.codigos_cid = avaliacao.codigos_cid ?? [];
        draft.avaliacao = avaliacao;
        break;
      }
      case 'objetivos':
      case 'frequencia':
      case 'duracao_prevista': {
        const plano = draft.plano_tratamento ? { ...draft.plano_tratamento } : {};
        (plano as any)[field] = (plano as any)[field] ?? '';
        draft.plano_tratamento = plano;
        break;
      }
      case 'procedimentos':
      case 'equipamentos_utilizados': {
        const plano = draft.plano_tratamento ? { ...draft.plano_tratamento } : {};
        (plano as any)[field] = (plano as any)[field] ?? [];
        draft.plano_tratamento = plano;
        break;
      }
      case 'evolucoes':
        draft.evolucoes = draft.evolucoes ?? [];
        break;
      case 'resumo_tratamento':
        draft.resumo_tratamento = draft.resumo_tratamento ?? '';
        break;
      case 'conduta_sugerida':
        draft.conduta_sugerida = draft.conduta_sugerida ?? '';
        break;
      case 'recomendacoes':
        draft.recomendacoes = draft.recomendacoes ?? '';
        break;
      default:
        break;
    }
    return draft;
  };

  const applyTemplate = async (template: RelatorioTemplate) => {
    if (!selectedPatientId) {
      toast.error('Selecione um paciente na aba "Criar" antes de usar um modelo');
      setActiveTab('criar');
      return;
    }

    let base = editingRelatorio;
    if (!base) {
      base = await criarRelatorioPaciente(selectedPatientId, { openEditor: false });
    }
    if (!base) return;

    let updated = cloneRelatorio(base);
    updated.tipo_relatorio = template.tipo_relatorio;
    template.campos.forEach((campo) => {
      updated = ensureField({ ...updated }, campo);
    });
    setEditingRelatorio(updated);
    setIsEditorOpen(true);
    setActiveTab('criar');
    toast.success(`Modelo "${template.nome}" aplicado`);
  };

  const startCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(buildEmptyTemplate());
    setTemplateDialogOpen(true);
  };

  const startEditTemplate = (template: RelatorioTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({ ...template });
    setTemplateDialogOpen(true);
  };

  const duplicateTemplate = (template: RelatorioTemplate) => {
    const clone: RelatorioTemplate = {
      ...template,
      id: '',
      nome: `${template.nome} (cópia)`,
      organization_id: org?.id ?? template.organization_id ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveTemplateMutation.mutate(clone);
  };

  const handleTemplateSubmit = () => {
    saveTemplateMutation.mutate(templateForm);
  };

  const toggleCampo = (campoId: string) => {
    setTemplateForm((prev) => {
      const exists = prev.campos.includes(campoId);
      const campos = exists ? prev.campos.filter(c => c !== campoId) : [...prev.campos, campoId];
      return { ...prev, campos };
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Stethoscope className="h-8 w-8 text-primary" />
              Relatórios para Médicos
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie relatórios para comunicação com profissionais de saúde
            </p>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Estes relatórios são destinados à comunicação entre profissionais de saúde. Todas as informações são confidenciais e protegidas por sigilo profissional.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'criar' | 'lista')}>
          <TabsList>
            <TabsTrigger value="criar">Criar Relatório</TabsTrigger>
            <TabsTrigger value="lista">Relatórios Salvos</TabsTrigger>
          </TabsList>

          <TabsContent value="criar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Selecione o Paciente</CardTitle>
                <CardDescription>
                  O relatório será preenchido automaticamente com os dados disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Paciente *</Label>
                    <PatientCombobox
                      patients={pacientes}
                      value={selectedPatientId}
                      onValueChange={handlePatientSelect}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Modelos de Relatório</CardTitle>
                  <CardDescription>Crie e reutilize configurações para acelerar o fluxo</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={startCreateTemplate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo modelo
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingTemplates ? (
                  <div className="text-sm text-muted-foreground">Carregando modelos...</div>
                ) : (
                  <div className="space-y-3">
                    {templates.map((template) => {
                      const isBuiltin = template.organization_id === '__builtin__';
                      return (
                        <div key={template.id} className="p-4 border rounded-lg flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              {templateIcon(template.tipo_relatorio)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">{template.nome}</p>
                                {isBuiltin && <Badge variant="outline">Padrão</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">{template.descricao}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.campos.map((campo) => {
                                  const label = TEMPLATE_FIELD_OPTIONS.find(o => o.id === campo)?.label ?? campo;
                                  return (
                                    <Badge key={campo} variant="secondary" className="text-[10px]">
                                      {label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => applyTemplate(template)}>
                              <FileText className="h-4 w-4 mr-1" />
                              Usar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => isBuiltin ? duplicateTemplate(template) : startEditTemplate(template)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {isBuiltin ? 'Duplicar p/ editar' : 'Editar'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => duplicateTemplate(template)}>
                              <Copy className="h-4 w-4 mr-1" />
                              Duplicar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              disabled={isBuiltin || deleteTemplateMutation.isPending}
                              onClick={() => {
                                if (isBuiltin) return;
                                if (window.confirm('Excluir este modelo?')) {
                                  deleteTemplateMutation.mutate(template.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {!templates.length && (
                      <div className="text-sm text-muted-foreground">
                        Nenhum modelo encontrado. Crie um novo modelo para acelerar seus relatórios.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lista" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : !relatorios.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhum relatório salvo ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {relatorios.map((relatorio) => (
                      <div key={relatorio.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{relatorio.paciente?.nome}</p>
                            {relatorio.urgencia === 'alta' && (
                              <Badge variant="destructive">Alta</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(relatorio.data_emissao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{relatorio.tipo_relatorio}</Badge>
                            {relatorio.profissional_destino?.nome && (
                              <Badge variant="secondary">
                                Para: {relatorio.profissional_destino.nome}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setPreviewRelatorio(relatorio)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Visualizar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingRelatorio(relatorio); setIsEditorOpen(true); }}>
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={deleteRelatorio.isPending}
                            onClick={() => {
                              if (window.confirm('Excluir este relatório definitivamente?')) {
                                deleteRelatorio.mutate(relatorio.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                          <PDFDownloadLink
                            document={<RelatorioMedicoPDF data={relatorio} />}
                            fileName={`relatorio-medico-${relatorio.paciente?.nome?.replace(/\s+/g, '-')}-${format(new Date(relatorio.data_emissao), 'dd-MM-yyyy')}.pdf`}
                          >
                            {({ loading }) => (
                              <Button size="sm" disabled={loading}>
                                <Download className="h-4 w-4 mr-1" />
                                {loading ? 'Gerando...' : 'PDF'}
                              </Button>
                            )}
                          </PDFDownloadLink>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          </Tabs>

        {/* Dialog Editor */}
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="max-w-4xl max-h-[90vw]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                {editingRelatorio?.paciente?.nome
                  ? `Relatório: ${editingRelatorio.paciente.nome}`
                  : 'Novo Relatório'}
              </DialogTitle>
              <DialogDescription>
                Edite as informações do relatório. As alterações serão salvas.
              </DialogDescription>
            </DialogHeader>

            {editingRelatorio && (
              <RelatorioMedicoEditor
                data={editingRelatorio}
                onChange={setEditingRelatorio}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog Preview */}
        {previewRelatorio && (
          <Dialog open={!!previewRelatorio} onOpenChange={() => setPreviewRelatorio(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Visualização do Relatório</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold">Paciente:</span> {previewRelatorio.paciente?.nome}
                    </div>
                    <div>
                      <span className="font-semibold">Tipo:</span> {previewRelatorio.tipo_relatorio}
                    </div>
                    <div>
                      <span className="font-semibold">Data:</span> {format(new Date(previewRelatorio.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                    <div>
                      <span className="font-semibold">Urgência:</span> {previewRelatorio.urgencia}
                    </div>
                  </div>
                  {previewRelatorio.profissional_destino?.nome && (
                    <div className="text-sm">
                      <span className="font-semibold">Destinatário:</span> {previewRelatorio.profissional_destino.nome} - {previewRelatorio.profissional_destino.especialidade}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setEditingRelatorio(previewRelatorio);
                    setPreviewRelatorio(null);
                    setIsEditorOpen(true);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <PDFDownloadLink
                    document={<RelatorioMedicoPDF data={previewRelatorio} />}
                    fileName={`relatorio-medico-${previewRelatorio.paciente?.nome?.replace(/\s+/g, '-')}-${format(new Date(previewRelatorio.data_emissao), 'dd-MM-yyyy')}.pdf`}
                  >
                    {({ loading }) => (
                      <Button disabled={loading}>
                        <Download className="h-4 w-4 mr-2" />
                        {loading ? 'Gerando...' : 'Baixar PDF'}
                      </Button>
                    )}
                  </PDFDownloadLink>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog Template CRUD */}
        <Dialog
          open={templateDialogOpen}
          onOpenChange={(open) => {
            setTemplateDialogOpen(open);
            if (!open) {
              setEditingTemplate(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                {editingTemplate ? 'Editar modelo' : 'Novo modelo'}
              </DialogTitle>
              <DialogDescription>
                Defina os campos obrigatórios e o tipo de relatório para reutilizar rapidamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do modelo</Label>
                <Input
                  value={templateForm.nome}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Avaliação ortopédica detalhada"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={templateForm.descricao}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, descricao: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de relatório</Label>
                <Select
                  value={templateForm.tipo_relatorio}
                  onValueChange={(v) => setTemplateForm((prev) => ({ ...prev, tipo_relatorio: v as RelatorioMedicoData['tipo_relatorio'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inicial">Avaliação inicial</SelectItem>
                    <SelectItem value="evolucao">Evolução</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="interconsulta">Interconsulta</SelectItem>
                    <SelectItem value="cirurgico">Pré/Pós-operatório</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Campos incluídos</Label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {TEMPLATE_FIELD_OPTIONS.map((campo) => (
                    <label key={campo.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={templateForm.campos.includes(campo.id)}
                        onCheckedChange={() => toggleCampo(campo.id)}
                      />
                      {campo.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleTemplateSubmit} disabled={saveTemplateMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveTemplateMutation.isPending ? 'Salvando...' : 'Salvar modelo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

export { RelatorioMedicoPDF };
