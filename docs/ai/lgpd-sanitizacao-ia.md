# Sanitização LGPD na Inteligência Artificial (FisioFlow)

## Visão Geral
Para garantir conformidade com a LGPD e o sigilo fisioterapeuta-paciente, implementamos uma camada estrita de Minimização e Sanitização de PII (Personally Identifiable Information) que age ANTES de qualquer requisição ser enviada pelo `AIRouter`.

## Estratégia "Fail-Safe"
- A sanitização é bloqueante. Se a rotina falhar por qualquer motivo (ex: regex timeout, erro de código), a chamada de IA **não é enviada**.
- Provedores externos (ex: Google, OpenAI) NUNCA recebem dados diretos (como nome, CPF, e-mail).
- Modelos que processam contextos puros de prontuário só são permitidos se classificados como "provedores internos" (ex: Cloudflare Workers AI rodando na própria Edge sob a infraestrutura do tenant).

## Níveis de Exposição (DataExposureLevel)

O nível é definido *hardcoded* para cada tipo de task (`TaskType`) dentro de `aiTasks.ts`.

1. **`none`**:
   - Nenhum contexto clínico é passado para a IA.
   - Aplica-se a: Relatórios administrativos genéricos, busca em biblioteca (RAG Wiki), Dúvidas de Sistema.
   - Se o prompt contiver acidentalmente PII, a rotina `redactPII` tenta limpá-lo.

2. **`minimal`**:
   - Passa contexto basal (ex: idade, gênero) e ofusca qualquer PII (CPF, e-mail, telefone). 
   - Nome do paciente é ativamente substituído pela string `"Paciente"`.
   - Aplica-se a: Mensagens transacionais, lembretes de agenda, explicações de risco de no-show.

3. **`clinical_context`**:
   - Passa histórico e anotações, MAS limpa os identificadores diretos.
   - Aplica-se a: Rascunho de evolução SOAP, resumo de alta, sumarização clínica.
   - Exige que o fisioterapeuta revise o resultado gerado. A resposta da IA é sempre um "Sugestão/Rascunho".

4. **`full_internal_only`**:
   - Passa todo o histórico. 
   - **Regra:** SÓ PODE ser direcionado a provedores internos seguros (Workers AI local).
   - Se o provedor configurado for `google` ou `openai`, a requisição falha e retorna `EXPOSURE_VIOLATION`.

## Auditoria e Logs
O `AIRouter` registra os metadados da sanitização (quais entidades foram censuradas: `[CPF, EMAIL, NAME]`), mas o prompt sensível original NÃO é armazenado no banco de dados.
