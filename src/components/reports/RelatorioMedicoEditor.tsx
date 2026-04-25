import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Save, Stethoscope } from "lucide-react";
import type { RelatorioMedicoData } from "@/pages/relatorios/RelatorioMedicoPage";

export function RelatorioMedicoEditor({
  data,
  onChange,
  onSave,
  onCancel,
}: {
  data: RelatorioMedicoData;
  onChange: (data: RelatorioMedicoData) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <ScrollArea className="h-[70vh] pr-4">
      <div className="space-y-6">
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
                  onValueChange={(v) =>
                    onChange({
                      ...data,
                      tipo_relatorio: v as
                        | "inicial"
                        | "evolucao"
                        | "alta"
                        | "interconsulta"
                        | "cirurgico",
                    })
                  }
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
                  value={data.urgencia || "baixa"}
                  onValueChange={(v) =>
                    onChange({
                      ...data,
                      urgencia: v as "baixa" | "media" | "alta",
                    })
                  }
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
                  onChange={(e) =>
                    onChange({
                      ...data,
                      paciente: { ...data.paciente, nome: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={data.paciente.cpf || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      paciente: { ...data.paciente, cpf: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={data.paciente.data_nascimento || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      paciente: {
                        ...data.paciente,
                        data_nascimento: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Idade</Label>
                <Input
                  placeholder="Ex: 35 anos"
                  value={data.paciente.idade || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      paciente: { ...data.paciente, idade: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={data.paciente.telefone || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      paciente: { ...data.paciente, telefone: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="paciente@email.com"
                  value={data.paciente.email || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      paciente: { ...data.paciente, email: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
                  value={data.profissional_destino?.nome || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      profissional_destino: {
                        ...data.profissional_destino,
                        nome: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Input
                  placeholder="Ex: Ortopedia, Neurologia"
                  value={data.profissional_destino?.especialidade || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      profissional_destino: {
                        ...data.profissional_destino,
                        especialidade: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Instituição/Hospital</Label>
                <Input
                  placeholder="Nome da instituição"
                  value={data.profissional_destino?.instituicao || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      profissional_destino: {
                        ...data.profissional_destino,
                        instituicao: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone do Médico</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={data.profissional_destino?.telefone || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      profissional_destino: {
                        ...data.profissional_destino,
                        telefone: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email do Destinatário</Label>
                <Input
                  type="email"
                  placeholder="medico@hospital.com"
                  value={data.profissional_destino?.email || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      profissional_destino: {
                        ...data.profissional_destino,
                        email: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {data.patientId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Controle do relatório</CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Marque quando o relatório for feito e quando for enviado ao médico. Os dados ficam
                vinculados ao paciente.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={data.relatorio_feito ?? false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...data,
                        relatorio_feito: !!checked,
                      })
                    }
                  />
                  <span className="text-sm">Relatório feito</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={data.relatorio_enviado ?? false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...data,
                        relatorio_enviado: !!checked,
                      })
                    }
                  />
                  <span className="text-sm">Relatório enviado ao médico</span>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

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
                value={data.historico_clinico?.queixa_principal || ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    historico_clinico: {
                      ...data.historico_clinico,
                      queixa_principal: e.target.value,
                    },
                  })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Histórico de Doenças Atuais</Label>
              <Textarea
                placeholder="Doenças e condições atuais..."
                value={data.historico_clinico?.historico_doencas_atuais || ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    historico_clinico: {
                      ...data.historico_clinico,
                      historico_doencas_atuais: e.target.value,
                    },
                  })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Medicamentos em Uso</Label>
                <Textarea
                  placeholder="Liste os medicamentos..."
                  value={data.historico_clinico?.medicamentos_em_uso || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      historico_clinico: {
                        ...data.historico_clinico,
                        medicamentos_em_uso: e.target.value,
                      },
                    })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Alergias</Label>
                <Textarea
                  placeholder="Alergias conhecidas..."
                  value={data.historico_clinico?.alergias || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      historico_clinico: {
                        ...data.historico_clinico,
                        alergias: e.target.value,
                      },
                    })
                  }
                  rows={2}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cirurgias Prévias</Label>
              <Textarea
                placeholder="Cirurgias anteriores relevantes..."
                value={data.historico_clinico?.cirurgias_previas || ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    historico_clinico: {
                      ...data.historico_clinico,
                      cirurgias_previas: e.target.value,
                    },
                  })
                }
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

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
                  value={data.avaliacao?.data_avaliacao || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      avaliacao: {
                        ...data.avaliacao,
                        data_avaliacao: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>CIDs (separados por vírgula)</Label>
                <Input
                  placeholder="Ex: M54.5, M75.4"
                  value={data.avaliacao?.codigos_cid?.join(", ") || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      avaliacao: {
                        ...data.avaliacao,
                        codigos_cid: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Inspeção Visual</Label>
              <Textarea
                placeholder="Observações visuais (postura, assimetrias, edema, cicatrizes...)"
                value={data.avaliacao?.inspecao_visual || ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    avaliacao: {
                      ...data.avaliacao,
                      inspecao_visual: e.target.value,
                    },
                  })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Palpação</Label>
              <Textarea
                placeholder="Findings à palpação (pontos dolorosos, tônus muscular, temperatura...)"
                value={data.avaliacao?.palpacao || ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    avaliacao: { ...data.avaliacao, palpacao: e.target.value },
                  })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goniometria (ADM)</Label>
                <Textarea
                  placeholder="Amplitudes de movimento encontradas..."
                  value={data.avaliacao?.goniometria || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      avaliacao: {
                        ...data.avaliacao,
                        goniometria: e.target.value,
                      },
                    })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Força Muscular</Label>
                <Textarea
                  placeholder="Testes de força (escala de Oxford/LOF...)"
                  value={data.avaliacao?.forca_muscular || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      avaliacao: {
                        ...data.avaliacao,
                        forca_muscular: e.target.value,
                      },
                    })
                  }
                  rows={2}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Teste Funcional</Label>
              <Textarea
                placeholder="Testes funcionais realizados e resultados..."
                value={data.avaliacao?.teste_funcional || ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    avaliacao: {
                      ...data.avaliacao,
                      teste_funcional: e.target.value,
                    },
                  })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Diagnóstico Fisioterapêutico</Label>
              <Textarea
                placeholder="Diagnóstico funcional do fisioterapeuta..."
                value={data.avaliacao?.diagnostico_fisioterapeutico || ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    avaliacao: {
                      ...data.avaliacao,
                      diagnostico_fisioterapeutico: e.target.value,
                    },
                  })
                }
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plano de Tratamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Objetivos do Tratamento</Label>
              <Textarea
                placeholder="Objetivos terapêuticos..."
                value={data.plano_tratamento?.objetivos || ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    plano_tratamento: {
                      ...data.plano_tratamento,
                      objetivos: e.target.value,
                    },
                  })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Procedimentos (separados por vírgula)</Label>
                <Textarea
                  placeholder="Ex: Cinesioterapia, Fisioterapia manual, RPG"
                  value={data.plano_tratamento?.procedimentos?.join(", ") || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      plano_tratamento: {
                        ...data.plano_tratamento,
                        procedimentos: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Equipamentos Utilizados</Label>
                <Textarea
                  placeholder="Ex: TENS, Ultrassom, Mesa de flexão"
                  value={data.plano_tratamento?.equipamentos_utilizados?.join(", ") || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      plano_tratamento: {
                        ...data.plano_tratamento,
                        equipamentos_utilizados: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  rows={2}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Input
                  placeholder="Ex: 3x por semana"
                  value={data.plano_tratamento?.frequencia || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      plano_tratamento: {
                        ...data.plano_tratamento,
                        frequencia: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Duração Prevista</Label>
                <Input
                  placeholder="Ex: 4 semanas"
                  value={data.plano_tratamento?.duracao_prevista || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      plano_tratamento: {
                        ...data.plano_tratamento,
                        duracao_prevista: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo e Conduta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Resumo do Tratamento</Label>
              <Textarea
                placeholder="Resumo geral do tratamento realizado..."
                value={data.resumo_tratamento || ""}
                onChange={(e) => onChange({ ...data, resumo_tratamento: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Conduta Sugerida</Label>
              <Textarea
                placeholder="Conductas sugeridas ao médico destinatário..."
                value={data.conduta_sugerida || ""}
                onChange={(e) => onChange({ ...data, conduta_sugerida: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Recomendações</Label>
              <Textarea
                placeholder="Recomendações adicionais..."
                value={data.recomendacoes || ""}
                onChange={(e) => onChange({ ...data, recomendacoes: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

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
