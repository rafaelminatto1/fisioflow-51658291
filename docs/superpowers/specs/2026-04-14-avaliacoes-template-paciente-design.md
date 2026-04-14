# Avaliacoes por Template no Perfil do Paciente

## Contexto

Na tela `/templates`, o botao "Usar Template" abre um modal que pede um paciente e aciona a acao "Iniciar Atendimento". O comportamento esperado e outro: ao selecionar um template e um paciente, o usuario deve criar uma avaliacao clinica daquele paciente usando o template escolhido.

O sistema ja possui a rota `/patients/:patientId/evaluations/new/:formId?` e a tabela `patient_evaluation_responses`, que permite multiplas avaliacoes para o mesmo paciente. O problema atual e que essa tabela funciona mais como resposta final da ficha e a UI do perfil ainda nao mostra essas avaliacoes como historico proprio.

## Objetivos

- Trocar o significado do fluxo de `/templates` de "iniciar atendimento" para "criar avaliacao".
- Permitir que o usuario escolha se a avaliacao sera realizada agora ou em uma data futura.
- Quando a data for futura, criar imediatamente uma avaliacao agendada/rascunho no perfil do paciente.
- Permitir multiplas avaliacoes por paciente, com status claro e historico visivel.
- Reutilizar a tela existente de preenchimento de avaliacao sempre que a avaliacao for iniciada ou continuada.

## Fora do Escopo

- Recriar a agenda clinica ou transformar toda avaliacao em consulta obrigatoria.
- Alterar o fluxo SOAP de atendimento.
- Reescrever o builder de templates.
- Implementar assinatura, impressao final ou PDF de avaliacao neste ciclo.

## Modelo de Dados

`patient_evaluation_responses` passa a representar uma instancia de avaliacao do paciente.

Campos novos recomendados:

- `status`: `scheduled`, `in_progress`, `completed`, `cancelled`
- `scheduled_for`: data/hora planejada da avaliacao
- `started_at`: data/hora em que o preenchimento foi iniciado
- `completed_at`: data/hora em que a avaliacao foi finalizada

Campos existentes continuam:

- `patient_id`: paciente avaliado
- `form_id`: template/ficha de avaliacao persistida
- `appointment_id`: opcional, quando a avaliacao estiver ligada a um agendamento
- `responses`: respostas parciais ou finais da ficha
- `created_at` e `updated_at`: auditoria tecnica

Regra principal: o mesmo paciente pode ter varias linhas em `patient_evaluation_responses`, inclusive para o mesmo `form_id`, desde que sejam instancias diferentes de avaliacao.

## Templates Internos

Alguns templates da biblioteca sao `builtin-*` e nao existem como registros UUID na tabela `evaluation_forms`. Como `patient_evaluation_responses.form_id` referencia `evaluation_forms.id`, a aplicacao de um template interno deve primeiro materializar uma copia persistida para a organizacao.

Fluxo recomendado:

- Se o template ja for persistido, usar o `form_id` diretamente.
- Se o template for `builtin-*`, criar uma ficha em `evaluation_forms` com os campos correspondentes antes de criar a avaliacao.
- Reutilizar uma copia ja materializada quando houver um identificador de origem suficiente para evitar duplicacao desnecessaria.

## Fluxo de UI em `/templates`

O modal "Aplicar Template" deve virar "Nova Avaliacao".

Campos:

- Paciente
- Quando realizar:
  - "Agora"
  - "Agendar para depois"
- Data/hora, visivel apenas quando "Agendar para depois" estiver selecionado

Acoes:

- "Cancelar": fecha o modal sem criar avaliacao.
- "Criar e preencher agora": cria avaliacao `in_progress`, define `started_at`, e navega para a tela de preenchimento.
- "Agendar avaliacao": cria avaliacao `scheduled`, define `scheduled_for`, fecha o modal e exibe confirmacao.

Textos devem evitar "atendimento" nesse fluxo. O termo correto e "avaliacao".

## Fluxo de Preenchimento

A tela `NewEvaluationPage` deve aceitar uma avaliacao ja existente, por exemplo por query string `evaluationId`.

Ao abrir com `evaluationId`:

- Buscar a instancia da avaliacao.
- Carregar o template vinculado.
- Preencher o formulario com `responses` existentes.
- Se o status for `scheduled`, atualizar para `in_progress` e definir `started_at`.
- Ao salvar/finalizar, atualizar a mesma instancia e marcar `completed`.

Ao abrir apenas com `formId`, manter compatibilidade criando a avaliacao no momento do salvamento ou criando um rascunho ao iniciar, conforme o fluxo chamador.

## Perfil do Paciente

A aba "Historico Clinico" deve exibir uma secao "Avaliacoes" antes ou ao lado das sessoes SOAP.

Cada avaliacao deve mostrar:

- Nome do template
- Status
- Data agendada, iniciada ou concluida
- Quantidade de campos respondidos
- Acoes:
  - "Preencher" para `scheduled`
  - "Continuar" para `in_progress`
  - "Ver" para `completed`

Essa lista deve buscar avaliacoes por `patient_id`, nao por um template especifico.

## API

Adicionar endpoints ou expandir os existentes para cobrir o ciclo de vida da instancia:

- `GET /api/evaluation-forms/responses?patientId=...`: lista todas as avaliacoes do paciente, com dados basicos da ficha.
- `GET /api/evaluation-forms/responses/:responseId`: retorna uma avaliacao especifica.
- `POST /api/evaluation-forms/:id/responses`: cria avaliacao com `status`, `scheduled_for`, `responses` inicial vazio e paciente.
- `PUT /api/evaluation-forms/responses/:responseId`: atualiza respostas e status.

O endpoint atual `GET /api/evaluation-forms/:id/responses?patientId=...` pode continuar existindo para compatibilidade.

## Estados

- `scheduled`: avaliacao criada para data futura, sem preenchimento ativo.
- `in_progress`: avaliacao aberta para preenchimento, podendo ter respostas parciais.
- `completed`: avaliacao finalizada.
- `cancelled`: avaliacao cancelada sem compor historico clinico ativo.

Transicoes permitidas:

- `scheduled` -> `in_progress`
- `scheduled` -> `cancelled`
- `in_progress` -> `completed`
- `in_progress` -> `cancelled`

## Erros e Validacoes

- Nao permitir criar avaliacao sem paciente.
- Nao permitir agendar sem data/hora.
- Validar que paciente e ficha pertencem a mesma organizacao.
- Para data futura, rejeitar datas claramente no passado.
- Se a materializacao de template interno falhar, nao criar avaliacao parcial.
- Ao salvar respostas, preservar respostas anteriores quando o usuario estiver continuando uma avaliacao.

## Testes

Testes unitarios ou de integracao devem cobrir:

- Criacao de avaliacao `scheduled` com `scheduled_for`.
- Criacao de avaliacao `in_progress` no fluxo "agora".
- Listagem de multiplas avaliacoes do mesmo paciente.
- Atualizacao de uma avaliacao existente para `completed`.
- Rota de `/templates` navegando para preenchimento com `evaluationId` quando for "agora".
- Perfil do paciente exibindo avaliacoes agendadas, em andamento e concluidas.

## Plano de Implementacao

1. Migrar tabela/API para suportar status e datas da instancia de avaliacao.
2. Adicionar metodos client em `evaluationFormsApi.responses`.
3. Ajustar modal de `/templates` para criar avaliacao agora ou agendada.
4. Ajustar `NewEvaluationPage` para carregar e atualizar `evaluationId`.
5. Adicionar lista de avaliacoes no perfil do paciente.
6. Rodar testes direcionados e validacao manual do fluxo.
