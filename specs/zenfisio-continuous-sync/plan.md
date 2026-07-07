# Plano: Sync incremental ZenFisio → MoocaFisio

## Contexto técnico
- Origem: ZenFisio autenticado via Chrome CDP (`app.zenfisio.com`).
- Destino: Neon Postgres do MoocaFisio/FisioFlow.
- Tabelas destino principais:
  - `patients`
  - `appointments`
  - `sessions`
  - `medical_records` futuro/condicional
- Campos estruturados já existentes em `sessions`:
  - `procedures jsonb`
  - `exercises jsonb`
  - `home_exercises jsonb`

## Constitution Check
- Spec-first: `spec.md`, `plan.md`, `tasks.md` criados.
- Privacy/LGPD: sync por tenant, sem exposição de segredo em relatório final.
- Incremental: todos os scripts devem ter dry-run.
- Observabilidade: gerar logs/JSON de estado e relatório markdown.
- Segurança: não apagar dados sem comando explícito.

## Decisão arquitetural
Não criar tabela nova de procedimentos agora. O sistema já tem modelo de evolução com JSONB por sessão. Para manter compatibilidade imediata com a UI e relatórios, o sync escreve:
- agenda em `appointments`;
- evolução/prontuário textual em `sessions.observacao`;
- procedimentos em `sessions.procedures`;
- exercícios de sessão em `sessions.exercises`;
- exercícios domiciliares em `sessions.home_exercises`.

A tabela `servicos` fica reservada para cadastro administrativo/financeiro de serviços, não para procedimento clínico realizado.

## Implementação
1. Manter extrator CDP como fonte de JSON incremental.
2. Normalizar eventos únicos por `paciente_id + data_completa + tipo + appointment_id`.
3. Criar/atualizar `appointments` para todos os eventos únicos.
4. Para eventos clínicos com texto, criar/atualizar `sessions` e linkar `appointment_id`.
5. Limpar boilerplate do ZenFisio antes de gravar/classificar.
6. Classificar procedimentos/exercícios com dicionário conservador.
7. Validar idempotência.

## Riscos e mitigação
- ZenFisio duplica itens no HTML: dedupe por chave estável.
- Eventos `Avaliação` sem texto/appointment_id podem ser agenda futura: importar como appointment, não como sessão clínica.
- Texto clínico pode conter rodapé/scripts: limpar marcadores conhecidos antes de classificar.
- Nome duplicado de paciente: preferir `paciente_id` do ZenFisio quando disponível no arquivo; se não houver coluna de legacy ID no destino, usar nome + data com cuidado.

## Validação
- Dry-run: contagem de appointments/sessions que seriam criados/atualizados.
- Apply: executar só após dry-run sem falhas.
- Pós-apply:
  - dry-run deve retornar 0 mudanças;
  - buscar duplicidades por paciente/data/hora;
  - checar appointments linkados a sessions;
  - checar texto sujo em `observacao`.
