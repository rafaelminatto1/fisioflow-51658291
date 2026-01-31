import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText, Stethoscope, Edit, Eye,
  Activity, CheckCircle2, PenTool,
  Bone, Heart, TrendingUp, Save
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, query as firestoreQuery, where, getDocs, addDoc, updateDoc, setDoc, doc, getDoc, limit, orderBy as firestoreOrderBy } from '@/integrations/firebase/app';
nizations';
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
  const [activeTab, setActiveTab] = useState<'criar' | 'lista' | 'modelos'>('criar');

  // Estado para novo relatório
  const [novoRelatorio] = useState<RelatorioMedicoData>({
    id: '',
    tipo_relatorio: 'inicial',
    paciente: {
      nome: '',
    },
    profissional_emissor: {
      nome: '',
      registro: '',
      especialidade: 'Fisioterapia',
    },
    profissional_destino: {},
    clinica: {
      nome: '',
    },
    data_emissao: new Date().toISOString(),
    urgencia: 'baixa',
  });

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

  // Buscar pacientes
  const { data: pacientes = [] } = useQuery({
    queryKey: ['pacientes-select-relatorio'],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, 'patients'), firestoreOrderBy('full_name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Array<{ id: string; full_name: string }>;
    },
  });

  // Salvar relatório
  const saveRelatorio = useMutation({
    mutationFn: async (data: RelatorioMedicoData) => {
      if (data.id) {
        const docRef = doc(db, 'relatorios_medicos', data.id);
        await setDoc(docRef, data, { merge: true });
        return data;
      } else {
        const { id, ...rest } = data;
        const docRef = await addDoc(collection(db, 'relatorios_medicos'), rest);
        return { id: docRef.id, ...rest };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorios-medicos'] });
      toast.success('Relatório salvo com sucesso!');
      setIsEditorOpen(false);
      setEditingRelatorio(null);
    },
    onError: () => toast.error('Erro ao salvar relatório'),
  });

  // Carregar dados do profissional
  const carregarDadosProfissional = async () => {
    if (!user) return { profile: null, org: null };
    const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
    const profile = profileDoc.exists() ? profileDoc.data() : null;

    return { profile, org };
  };

  // Criar relatório a partir de paciente
  const criarRelatorioPaciente = async (pacienteId: string) => {
    const paciente = pacientes.find(p => p.id === pacienteId);
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

    const relatorio: RelatorioMedicoData = {
      id: '',
      tipo_relatorio: 'inicial',
      paciente: {
        nome: paciente.full_name,
        cpf: paciente.cpf || '',
        data_nascimento: paciente.birth_date || '',
        telefone: paciente.phone || '',
        email: paciente.email || '',
      },
      profissional_emissor: {
        nome: profile?.full_name || '',
        registro: profile?.registro_profissional || '',
        uf_registro: profile?.uf_registro || '',
        especialidade: 'Fisioterapia',
        email: profile?.email || '',
        telefone: profile?.phone || '',
      },
      profissional_destino: {},
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
    };

    setEditingRelatorio(relatorio);
    setIsEditorOpen(true);
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

  const templates = [
    {
      id: 'avaliacao_inicial',
      nome: 'Avaliação Inicial Completa',
      descricao: 'Relatório completo de avaliação inicial para enviar ao médico',
      icone: <Activity className="h-6 w-6 text-blue-500" />,
      tipo: 'inicial' as const,
      campos: ['queixa_principal', 'historico_doencas_atuais', 'medicamentos_em_uso', 'alergias', 'inspecao_visual', 'palpacao', 'goniometria', 'forca_muscular', 'teste_funcional', 'diagnostico_fisioterapeutico'],
    },
    {
      id: 'evolucao_mensal',
      nome: 'Evolução Mensal',
      descricao: 'Atualização da evolução do paciente para o médico assistente',
      icone: <TrendingUp className="h-6 w-6 text-green-500" />,
      tipo: 'evolucao' as const,
      campos: ['resumo_tratamento', 'evolucoes', 'conduta_sugerida'],
    },
    {
      id: 'alta_medica',
      nome: 'Relatório de Alta',
      descricao: 'Documento de alta para encerramento do tratamento',
      icone: <CheckCircle2 className="h-6 w-6 text-purple-500" />,
      tipo: 'alta' as const,
      campos: ['resumo_tratamento', 'conduta_sugerida', 'recomendacoes'],
    },
    {
      id: 'interconsulta',
      nome: 'Solicitação de Interconsulta',
      descricao: 'Pedido de avaliação com especialista',
      icone: <Stethoscope className="h-6 w-6 text-orange-500" />,
      tipo: 'interconsulta' as const,
      campos: ['queixa_principal', 'historico_doencas_atuais', 'conduta_sugerida'],
    },
    {
      id: 'pre_operatorio',
      nome: 'Pré-Operatório',
      descricao: 'Avaliação pré-cirúrgica para preparar o paciente',
      icone: <Bone className="h-6 w-6 text-red-500" />,
      tipo: 'cirurgico' as const,
      campos: ['inspecao_visual', 'palpacao', 'goniometria', 'forca_muscular', 'teste_funcional'],
    },
    {
      id: 'pos_operatorio',
      nome: 'Pós-Operatório',
      descricao: 'Acompanhamento de reabilitação pós-cirúrgica',
      icone: <Heart className="h-6 w-6 text-pink-500" />,
      tipo: 'cirurgico' as const,
      campos: ['evolucoes', 'resumo_tratamento', 'conduta_sugerida'],
    },
  ];

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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'criar' | 'lista' | 'modelos')}>
          <TabsList>
            <TabsTrigger value="criar">Criar Relatório</TabsTrigger>
            <TabsTrigger value="lista">Relatórios Salvos</TabsTrigger>
            <TabsTrigger value="modelos">Modelos Prontos</TabsTrigger>
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
                    <Select onValueChange={(v) => criarRelatorioPaciente(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        {pacientes.map(paciente => (
                          <SelectItem key={paciente.id} value={paciente.id}>
                            {paciente.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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

          <TabsContent value="modelos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Modelos de Relatório Disponíveis</CardTitle>
                <CardDescription>
                  Selecione um modelo para começar rapidamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                      onClick={() => {
                        toast.info(`Selecione um paciente primeiro para usar o modelo "${template.nome}"`);
                      }}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            {template.icone}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{template.nome}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {template.descricao}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
      </div>
    </MainLayout>
  );
}

export { RelatorioMedicoPDF };
