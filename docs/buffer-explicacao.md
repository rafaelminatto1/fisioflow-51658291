# O que é Buffer em Tipos de Atendimento?

## Conceito

**Buffer** é um tempo de margem adicionado antes ou depois de um atendimento para preparação, limpeza ou descanso do profissional.

## Tipos de Buffer

### Buffer Antes (Buffer Before)
- **Tempo reservado ANTES do atendimento**
- Usado para:
  - Preparar a sala
  - Revisar o prontuário do paciente
  - Organizar materiais necessários
  - Transição entre pacientes

**Exemplo**: Se você configura 5 minutos de buffer antes:
- Atendimento agendado: 10:00
- Você tem de 09:55 até 10:00 para se preparar
- O horário fica bloqueado na agenda

### Buffer Depois (Buffer After)
- **Tempo reservado DEPOIS do atendimento**
- Usado para:
  - Registrar anotações no prontuário
  - Limpar e organizar a sala
  - Descanso breve
  - Preparar para o próximo paciente

**Exemplo**: Se você configura 10 minutos de buffer depois:
- Atendimento termina: 10:45
- Você tem até 10:55 para finalizar
- O próximo horário disponível é 10:55 ou depois

## Exemplo Prático Completo

**Configuração**:
- Duração: 45 minutos
- Buffer antes: 5 minutos
- Buffer depois: 10 minutos

**Na agenda**:
```
09:55 - 10:00  [Buffer Antes - preparação]
10:00 - 10:45  [Atendimento com o paciente]
10:45 - 10:55  [Buffer Depois - finalização]
```

**Tempo total bloqueado**: 60 minutos (5 + 45 + 10)

## Benefícios

1. **Qualidade**: Tempo adequado para preparação e registro
2. **Organização**: Evita correria entre atendimentos
3. **Profissionalismo**: Sala sempre pronta para o próximo paciente
4. **Bem-estar**: Reduz estresse e fadiga do profissional

## Recomendações

| Tipo de Atendimento | Buffer Antes | Buffer Depois |
|---------------------|--------------|---------------|
| Avaliação Inicial   | 5-10 min     | 10-15 min     |
| Retorno             | 0-5 min      | 5 min         |
| Reabilitação        | 5 min        | 5-10 min      |
| Procedimentos       | 5-10 min     | 10 min        |
| Terapia Manual      | 5 min        | 5-10 min      |

## Configuração no FisioFlow

1. Acesse **Agenda** → **Configurações**
2. Vá para a aba **Tipos de Atendimento**
3. Expanda o tipo que deseja configurar
4. Ajuste os sliders:
   - **Buffer Antes (min)**: 0-30 minutos
   - **Buffer Depois (min)**: 0-30 minutos
5. As mudanças são salvas automaticamente

## Visualização na Agenda

O buffer aparece como:
- **Resumo**: "Buffer 5+10 min" (5 antes, 10 depois)
- **Na agenda**: Horários bloqueados antes e depois do atendimento
- **Cor**: Mesma cor do tipo de atendimento, mas com opacidade reduzida

## Dica

Se você não precisa de buffer, deixe ambos em **0 minutos**. Isso permite agendamentos consecutivos sem intervalos.
