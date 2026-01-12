import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EvaluationFormFieldFormData } from './useEvaluationForms';

// Definição das fichas padrão
export const STANDARD_FORMS = {
  ANAMNESE: {
    nome: 'Anamnese Completa',
    tipo: 'anamnese',
    descricao: 'Ficha de anamnese completa para fisioterapia',
    campos: [
      // Dados pessoais
      {
        rotulo: 'Nome Completo',
        pergunta: 'Qual o nome completo do paciente?',
        tipo_campo: 'texto_curto',
        secao: 'Dados Pessoais',
        ordem: 1,
        obrigatorio: true,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Data de Nascimento',
        pergunta: 'Data de nascimento',
        tipo_campo: 'data',
        secao: 'Dados Pessoais',
        ordem: 2,
        obrigatorio: true,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Ocupação',
        pergunta: 'Qual a ocupação profissional?',
        tipo_campo: 'texto_curto',
        secao: 'Dados Pessoais',
        ordem: 3,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Telefone',
        pergunta: 'Telefone para contato',
        tipo_campo: 'texto_curto',
        secao: 'Dados Pessoais',
        ordem: 4,
        obrigatorio: true,
      } as EvaluationFormFieldFormData,
      // Queixa e Histórico
      {
        rotulo: 'Queixa Principal',
        pergunta: 'Qual o motivo principal da consulta?',
        tipo_campo: 'texto_longo',
        secao: 'Queixa e Histórico',
        ordem: 5,
        obrigatorio: true,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Início do Problema',
        pergunta: 'Quando o problema começou?',
        tipo_campo: 'texto_curto',
        secao: 'Queixa e Histórico',
        ordem: 6,
        obrigatorio: true,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Histórico da Doença Atual',
        pergunta: 'Descreva como a doença evoluiu até hoje',
        tipo_campo: 'texto_longo',
        secao: 'Queixa e Histórico',
        ordem: 7,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Dor',
        pergunta: 'Qual a intensidade da dor (0-10)?',
        tipo_campo: 'escala',
        secao: 'Queixa e Histórico',
        ordem: 8,
        obrigatorio: true,
        minimo: 0,
        maximo: 10,
        opcoes: ['Sem dor', 'Dor máxima'],
      } as EvaluationFormFieldFormData,
      // Histórico Médico
      {
        rotulo: 'Doenças Preexistentes',
        pergunta: 'Possui alguma doença preexistente? (diabetes, hipertensão, etc.)',
        tipo_campo: 'texto_longo',
        secao: 'Histórico Médico',
        ordem: 9,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Cirurgias Prévias',
        pergunta: 'Já realizou alguma cirurgia? Quais?',
        tipo_campo: 'texto_longo',
        secao: 'Histórico Médico',
        ordem: 10,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Medicamentos em Uso',
        pergunta: 'Toma algum medicamento atualmente? Quais?',
        tipo_campo: 'texto_longo',
        secao: 'Histórico Médico',
        ordem: 11,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Alergias',
        pergunta: 'Possui alguma alergia a medicamentos ou alimentos?',
        tipo_campo: 'texto_longo',
        secao: 'Histórico Médico',
        ordem: 12,
        obrigatorio: true,
      } as EvaluationFormFieldFormData,
      // Histórico Familiar
      {
        rotulo: 'Histórico Familiar',
        pergunta: 'Algum familiar com problemas semelhantes?',
        tipo_campo: 'texto_longo',
        secao: 'Histórico Familiar',
        ordem: 13,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      // Hábitos de Vida
      {
        rotulo: 'Prática de Atividade Física',
        pergunta: 'Pratica alguma atividade física regularmente?',
        tipo_campo: 'radio',
        secao: 'Hábitos de Vida',
        ordem: 14,
        obrigatorio: false,
        opcoes: ['Sim', 'Não', 'Anteriormente'],
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Frequência da Atividade',
        pergunta: 'Quantas vezes por semana?',
        tipo_campo: 'texto_curto',
        secao: 'Hábitos de Vida',
        ordem: 15,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Tabagismo',
        pergunta: 'É fumante?',
        tipo_campo: 'radio',
        secao: 'Hábitos de Vida',
        ordem: 16,
        obrigatorio: false,
        opcoes: ['Sim', 'Não', 'Ex-fumante'],
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Consumo de Álcool',
        pergunta: 'Consome bebidas alcoólicas?',
        tipo_campo: 'radio',
        secao: 'Hábitos de Vida',
        ordem: 17,
        obrigatorio: false,
        opcoes: ['Não', 'Socialmente', 'Diariamente'],
      } as EvaluationFormFieldFormData,
      // Outros
      {
        rotulo: 'Observações Adicionais',
        pergunta: 'Alguma outra informação relevante?',
        tipo_campo: 'texto_longo',
        secao: 'Outros',
        ordem: 18,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
    ],
  },
  AVALIACAO_POSTURAL: {
    nome: 'Avaliação Postural',
    tipo: 'avaliacao_postural',
    descricao: 'Ficha de avaliação postural completa',
    campos: [
      // Vista Anterior
      {
        rotulo: 'Cabeça - Vista Anterior',
        pergunta: 'Observações sobre a posição da cabeça (vista anterior)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Anterior',
        ordem: 1,
        obrigatorio: false,
        descricao: 'Inclinações laterais, rotações, assimetrias',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Ombros - Vista Anterior',
        pergunta: 'Observações sobre os ombros (vista anterior)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Anterior',
        ordem: 2,
        obrigatorio: false,
        descricao: 'Nivelamento, elevação, protração, assimetrias',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Escápulas - Vista Anterior',
        pergunta: 'Observações sobre as escápulas (vista anterior)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Anterior',
        ordem: 3,
        obrigatorio: false,
        descricao: 'Alada, aderida, assimetrias',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Pelve - Vista Anterior',
        pergunta: 'Observações sobre a pelve (vista anterior)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Anterior',
        ordem: 4,
        obrigatorio: false,
        descricao: 'Nivelamento, inclinações, rotações',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Joelhos - Vista Anterior',
        pergunta: 'Observações sobre os joelhos (vista anterior)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Anterior',
        ordem: 5,
        obrigatorio: false,
        descricao: 'Varo, valgo, simetria',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Pés - Vista Anterior',
        pergunta: 'Observações sobre os pés (vista anterior)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Anterior',
        ordem: 6,
        obrigatorio: false,
        descricao: 'Plano, cavo, abdução, adução',
      } as EvaluationFormFieldFormData,
      // Vista Posterior
      {
        rotulo: 'Coluna Vertebral - Vista Posterior',
        pergunta: 'Observações sobre a coluna (vista posterior)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Posterior',
        ordem: 7,
        obrigatorio: false,
        descricao: 'Escolioses, gibosidade, alinhamento',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Escápulas - Vista Posterior',
        pergunta: 'Observações sobre as escápulas (vista posterior)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Posterior',
        ordem: 8,
        obrigatorio: false,
        descricao: 'Alinhamento, simetria, mobilidade',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Pelve - Vista Posterior',
        pergunta: 'Observações sobre a pelve (vista posterior)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Posterior',
        ordem: 9,
        obrigatorio: false,
        descricao: 'Nível, torsão, diferença de altura',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Tornozelos - Vista Posterior',
        pergunta: 'Observações sobre os tornozelos (vista posterior)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Posterior',
        ordem: 10,
        obrigatorio: false,
        descricao: 'Valgo, varo, diferença de altura',
      } as EvaluationFormFieldFormData,
      // Vista Lateral
      {
        rotulo: 'Cabeça - Vista Lateral',
        pergunta: 'Observações sobre a cabeça (vista lateral)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Lateral',
        ordem: 11,
        obrigatorio: false,
        descricao: 'Posição anteriorizada, posteriorizada, rotação',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Cervical - Vista Lateral',
        pergunta: 'Observações sobre a região cervical (vista lateral)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Lateral',
        ordem: 12,
        obrigatorio: false,
        descricao: 'Lordose, retificação, protração de cabeça',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Ombros - Vista Lateral',
        pergunta: 'Observações sobre os ombros (vista lateral)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Lateral',
        ordem: 13,
        obrigatorio: false,
        descricao: 'Protração, arredondamento',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Torax - Vista Lateral',
        pergunta: 'Observações sobre o tórax (vista lateral)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Lateral',
        ordem: 14,
        obrigatorio: false,
        descricao: 'Cifose, retificação, simetria',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Lombar - Vista Lateral',
        pergunta: 'Observações sobre a região lombar (vista lateral)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Lateral',
        ordem: 15,
        obrigatorio: false,
        descricao: 'Lordose, retificação, flexão',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Pelve - Vista Lateral',
        pergunta: 'Observações sobre a pelve (vista lateral)',
        tipo_campo: 'texto_longo',
        secao: 'Vista Lateral',
        ordem: 16,
        obrigatorio: false,
        descricao: 'Anterversão, retroversão, nível',
      } as EvaluationFormFieldFormData,
      // Testes Específicos
      {
        rotulo: 'Teste de Nash',
        pergunta: 'Resultado do teste de Nash (triângulo de Sorensen)',
        tipo_campo: 'dropdown',
        secao: 'Testes Específicos',
        ordem: 17,
        obrigatorio: false,
        opcoes: ['Normal', 'Alterado à direita', 'Alterado à esquerda', 'Não realizado'],
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Teste de Adams',
        pergunta: 'Resultado do teste de Adams para escoliose',
        tipo_campo: 'dropdown',
        secao: 'Testes Específicos',
        ordem: 18,
        obrigatorio: false,
        opcoes: ['Negativo', 'Positivo à direita', 'Positivo à esquerda', 'Não realizado'],
      } as EvaluationFormFieldFormData,
      // Mapa Corporal
      {
        rotulo: 'Mapa de Dor',
        pergunta: 'Indique as áreas de dor no corpo',
        tipo_campo: 'mapa_corporal',
        secao: 'Mapa Corporal',
        ordem: 19,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      // Conclusão
      {
        rotulo: 'Diagnóstico Postural',
        pergunta: 'Diagnóstico postural geral',
        tipo_campo: 'texto_longo',
        secao: 'Conclusão',
        ordem: 20,
        obrigatorio: true,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Conduta Sugerida',
        pergunta: 'Conduta terapêutica sugerida',
        tipo_campo: 'texto_longo',
        secao: 'Conclusão',
        ordem: 21,
        obrigatorio: true,
      } as EvaluationFormFieldFormData,
    ],
  },
  AVALIACAO_FUNCIONAL: {
    nome: 'Avaliação Funcional',
    tipo: 'avaliacao_funcional',
    descricao: 'Ficha de avaliação funcional e testes físicos',
    campos: [
      // Amplitude de Movimento
      {
        rotulo: 'ADM - Cervical',
        pergunta: 'Amplitude de movimento cervical (flexão, extensão, rotações, inclinações)',
        tipo_campo: 'texto_longo',
        secao: 'Amplitude de Movimento (ADM)',
        ordem: 1,
        obrigatorio: false,
        descricao: 'Descreva os graus de movimento encontrados',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'ADM - Ombros',
        pergunta: 'Amplitude de movimento dos ombros',
        tipo_campo: 'texto_longo',
        secao: 'Amplitude de Movimento (ADM)',
        ordem: 2,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'ADM - Cotovelos',
        pergunta: 'Amplitude de movimento dos cotovelos',
        tipo_campo: 'texto_longo',
        secao: 'Amplitude de Movimento (ADM)',
        ordem: 3,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'ADM - Punhos',
        pergunta: 'Amplitude de movimento dos punhos',
        tipo_campo: 'texto_longo',
        secao: 'Amplitude de Movimento (ADM)',
        ordem: 4,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'ADM - Coluna Torácica',
        pergunta: 'Amplitude de movimento da coluna torácica',
        tipo_campo: 'texto_longo',
        secao: 'Amplitude de Movimento (ADM)',
        ordem: 5,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'ADM - Coluna Lombar',
        pergunta: 'Amplitude de movimento da coluna lombar',
        tipo_campo: 'texto_longo',
        secao: 'Amplitude de Movimento (ADM)',
        ordem: 6,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'ADM - Quadris',
        pergunta: 'Amplitude de movimento dos quadris',
        tipo_campo: 'texto_longo',
        secao: 'Amplitude de Movimento (ADM)',
        ordem: 7,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'ADM - Joelhos',
        pergunta: 'Amplitude de movimento dos joelhos',
        tipo_campo: 'texto_longo',
        secao: 'Amplitude de Movimento (ADM)',
        ordem: 8,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'ADM - Tornozelos',
        pergunta: 'Amplitude de movimento dos tornozelos',
        tipo_campo: 'texto_longo',
        secao: 'Amplitude de Movimento (ADM)',
        ordem: 9,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      // Força Muscular
      {
        rotulo: 'Força - Cintura Escapular',
        pergunta: 'Testes de força da cintura escapular',
        tipo_campo: 'texto_longo',
        secao: 'Força Muscular',
        ordem: 10,
        obrigatorio: false,
        descricao: 'Use escala de Oxford/LOF (0-5)',
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Força - Cintura Pélvica',
        pergunta: 'Testes de força da cintura pélvica',
        tipo_campo: 'texto_longo',
        secao: 'Força Muscular',
        ordem: 11,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Força - Membros Superiores',
        pergunta: 'Testes de força dos membros superiores',
        tipo_campo: 'texto_longo',
        secao: 'Força Muscular',
        ordem: 12,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Força - Membros Inferiores',
        pergunta: 'Testes de força dos membros inferiores',
        tipo_campo: 'texto_longo',
        secao: 'Força Muscular',
        ordem: 13,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      // Reflexos
      {
        rotulo: 'Reflexos - Bicipital',
        pergunta: 'Reflexo bicipital',
        tipo_campo: 'dropdown',
        secao: 'Reflexos',
        ordem: 14,
        obrigatorio: false,
        opcoes: ['Normal (2+)', 'Hipo reflexia (0-1+)', 'Hiper reflexia (3-4+)', 'Ausente'],
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Reflexos - Tricipital',
        pergunta: 'Reflexo tricipital',
        tipo_campo: 'dropdown',
        secao: 'Reflexos',
        ordem: 15,
        obrigatorio: false,
        opcoes: ['Normal (2+)', 'Hipo reflexia (0-1+)', 'Hiper reflexia (3-4+)', 'Ausente'],
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Reflexos - Patelar',
        pergunta: 'Reflexo patelar',
        tipo_campo: 'dropdown',
        secao: 'Reflexos',
        ordem: 16,
        obrigatorio: false,
        opcoes: ['Normal (2+)', 'Hipo reflexia (0-1+)', 'Hiper reflexia (3-4+)', 'Ausente'],
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Reflexos - Aquileu',
        pergunta: 'Reflexo aquileu',
        tipo_campo: 'dropdown',
        secao: 'Reflexos',
        ordem: 17,
        obrigatorio: false,
        opcoes: ['Normal (2+)', 'Hipo reflexia (0-1+)', 'Hiper reflexia (3-4+)', 'Ausente'],
      } as EvaluationFormFieldFormData,
      // Testes Especiais
      {
        rotulo: 'Testes Especiais',
        pergunta: 'Testes ortopédicos especiais realizados',
        tipo_campo: 'texto_longo',
        secao: 'Testes Especiais',
        ordem: 18,
        obrigatorio: false,
        descricao: 'Ex: Lasegue, slump, Yergason, Speed, etc.',
      } as EvaluationFormFieldFormData,
      // Sensibilidade
      {
        rotulo: 'Sensibilidade - Superficial',
        pergunta: 'Teste de sensibilidade superficial (tato, dor, temperatura)',
        tipo_campo: 'texto_longo',
        secao: 'Sensibilidade',
        ordem: 19,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Sensibilidade - Profunda',
        pergunta: 'Teste de sensibilidade profunda (vibração, propriocepção)',
        tipo_campo: 'texto_longo',
        secao: 'Sensibilidade',
        ordem: 20,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      // Testes Funcionais
      {
        rotulo: 'Marcha',
        pergunta: 'Avaliação da marcha',
        tipo_campo: 'texto_longo',
        secao: 'Testes Funcionais',
        ordem: 21,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Equilíbrio',
        pergunta: 'Testes de equilíbrio (Romberg, tandem, etc.)',
        tipo_campo: 'texto_longo',
        secao: 'Testes Funcionais',
        ordem: 22,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Coordenação',
        pergunta: 'Testes de coordenação (dedo-nariz, calcanhar-joelho)',
        tipo_campo: 'texto_longo',
        secao: 'Testes Funcionais',
        ordem: 23,
        obrigatorio: false,
      } as EvaluationFormFieldFormData,
      // Conclusão
      {
        rotulo: 'Diagnóstico Funcional',
        pergunta: 'Diagnóstico funcional do paciente',
        tipo_campo: 'texto_longo',
        secao: 'Conclusão',
        ordem: 24,
        obrigatorio: true,
      } as EvaluationFormFieldFormData,
      {
        rotulo: 'Prognóstico',
        pergunta: 'Prognóstico estimado',
        tipo_campo: 'texto_longo',
        secao: 'Conclusão',
        ordem: 25,
        obrigatorio: true,
      } as EvaluationFormFieldFormData,
    ],
  },
};

// Hook para criar fichas padrão
export function useCreateStandardForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formType: keyof typeof STANDARD_FORMS) => {
      const formConfig = STANDARD_FORMS[formType];

      // Criar a ficha
      const { data: form, error: formError } = await supabase
        .from('evaluation_forms')
        .insert({
          nome: formConfig.nome,
          tipo: formConfig.tipo,
          descricao: formConfig.descricao,
          ativo: true,
        })
        .select()
        .single();

      if (formError) throw formError;

      // Criar os campos
      const fieldsToInsert = formConfig.campos.map(campo => ({
        form_id: form.id,
        rotulo: campo.rotulo,
        pergunta: campo.pergunta,
        tipo_campo: campo.tipo_campo,
        secao: campo.secao,
        ordem: campo.ordem,
        obrigatorio: campo.obrigatorio,
        descricao: campo.descricao || null,
        opcoes: campo.opcoes ? JSON.stringify(campo.opcoes) : null,
        minimo: campo.minimo || null,
        maximo: campo.maximo || null,
      }));

      const { error: fieldsError } = await supabase
        .from('evaluation_form_fields')
        .insert(fieldsToInsert);

      if (fieldsError) throw fieldsError;

      return form;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      toast.success('Ficha padrão criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar ficha padrão.');
    },
  });
}

// Hook para verificar se ficha padrão já existe
export function useStandardFormExists(formType: keyof typeof STANDARD_FORMS) {
  return useQuery({
    queryKey: ['standard-form-exists', formType],
    queryFn: async () => {
      const formConfig = STANDARD_FORMS[formType];

      const { data, error } = await supabase
        .from('evaluation_forms')
        .select('id')
        .eq('nome', formConfig.nome)
        .eq('tipo', formConfig.tipo)
        .eq('ativo', true)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
  });
}
