# Funcionalidade: Fichas de Avaliação

## Visão Geral

Sistema completo de fichas de avaliação com 21+ templates validados cientificamente e editor visual para criar fichas personalizadas.

## Templates Disponíveis

### Avaliações Esportivas (10)

1. Lesão muscular (Classificação de Munique)
2. Entorse de tornozelo (Regras de Ottawa)
3. Lesão de LCA
4. Tendinopatia patelar (VISA-P)
5. Síndrome da banda iliotibial
6. Ombro do atleta (ASES)
7. Concussão (SCAT5)
8. Síndrome de overtraining
9. Protocolo return-to-play
10. FMS (Functional Movement Screen)

### Avaliações Ortopédicas (10)

1. Lombalgia crônica (Oswestry)
2. Dor cervical (NDI)
3. Ombro (DASH)
4. Joelho (KOOS)
5. Quadril (HOOS)
6. Punho/mão (PRWE)
7. Tornozelo/pé (FAAM)
8. Artrose (WOMAC)
9. Avaliação postural completa
10. Síndrome dolorosa miofascial

### Avaliação Padrão (1)

1. Avaliação fisioterapêutica padrão

## Recursos

- ✅ 21 templates validados
- ✅ Editor visual de fichas
- ✅ Import/export de templates
- ✅ Referências científicas
- ✅ Múltiplos tipos de campo
- ✅ Organização por seções
- ✅ Respostas de pacientes

## Tipos de Campo

- `texto_curto` - Texto curto
- `texto_longo` - Área de texto
- `opcao_unica` - Select único
- `selecao` - Múltipla seleção
- `lista` - Lista de itens
- `escala` - Escala numérica
- `data` - Data
- `hora` - Hora
- `info` - Texto informativo
- `numero` - Número

## Páginas

- `/cadastros/evaluation-forms` - Gerenciar fichas
- `/cadastros/evaluation-forms/builder` - Editor visual
- `/cadastros/evaluation-forms/:id` - Preview da ficha
- `/patients/:id/evaluation` - Aplicar ficha

## Componentes

- `EvaluationFormBuilder` - Editor visual
- `EvaluationTemplateSelector` - Seletor de templates
- `DynamicFieldRenderer` - Renderer de campos
- `EvaluationFormPreview` - Preview da ficha

## API

```typescript
// GET /evaluation_forms
const { data } = await supabase
  .from('evaluation_forms')
  .select('*, evaluation_form_fields(*)')
  .eq('tipo', tipo);

// POST /evaluation_forms
const { data } = await supabase.from('evaluation_forms').insert({
  nome: 'Minha Ficha',
  tipo: 'ortopedica',
  fields: [...],
});

// POST /evaluation_responses
const { data } = await supabase.from('evaluation_responses').insert({
  form_id,
  patient_id,
  responses: {...},
});
```

## Veja Também

- [Prontuário](./prontuario.md) - Evoluções SOAP
- [Pacientes](./pacientes.md) - Gestão de pacientes
