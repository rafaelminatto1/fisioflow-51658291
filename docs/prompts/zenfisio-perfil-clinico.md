# Prompt para nova conversa Hermes — Perfil Clínico estruturado ZenFisio → MoocaFisio

Copie e cole todo este prompt em uma nova conversa do Hermes.

---

Você está trabalhando no projeto MoocaFisio/FisioFlow em:

```text
/home/rafael/Documents/fisioflow/fisioflow-51658291
```

## 1. Contexto geral

Quero continuar a migração/sincronização ZenFisio → MoocaFisio.

O objetivo é que o MoocaFisio aproveite melhor os dados clínicos que já existem no ZenFisio, principalmente avaliações/anamneses, para tomada de decisão clínica.

O ZenFisio é a fonte da verdade para:

- agenda;
- status de agendamento;
- evoluções clínicas;
- procedimentos/exercícios históricos;
- avaliações/anamneses;
- informações clínicas do paciente quando ainda não houver dado real/manual no MoocaFisio.

O MoocaFisio ainda não tem dados reais manuais relevantes, então pode atualizar/sobrescrever dados importados quando isso for necessário para deixar a base correta. Ainda assim:

- não apagar dados sem validação;
- não apagar sessões/appointments sem relatório;
- não fazer commit/push/deploy sem eu pedir explicitamente;
- nunca expor connection string, token, senha ou credencial no chat — use `[REDACTED]`.

## 2. Convenções do projeto

Siga `CLAUDE.md` do repositório.

Resumo das convenções importantes:

- TypeScript strict.
- UI em português do Brasil.
- Sem glassmorphism: nada de `backdrop-blur`/transparências como estilo principal.
- Stack principal:
  - Neon Postgres 17;
  - Cloudflare Workers/Hono em `apps/api/`;
  - React/Vite/Tailwind/Shadcn/Radix no frontend;
  - Drizzle/SQL/migrations em `apps/api/migrations/`.
- Antes de alterar código, inspecione arquivos existentes e schema real.
- Use `read_file`, `search_files`, `terminal`, `patch`/`write_file` — não invente APIs/imports.
- Rode validações reais antes de finalizar.

## 3. Trabalho já realizado antes desta conversa

Já foram criados/alterados scripts importantes:

```text
scripts/classify-zenfisio-procedures-exercises.mjs
scripts/zenfisio-scraper/scrape_evaluations_full_node.cjs
scripts/import-zenfisio-evaluations-structured.mjs
scripts/zenfisio-scraper/data/zenfisio-evaluations-full/evaluations_full.json
```

Também existem scripts recentes relacionados à agenda/calendário e importações:

```text
scripts/zenfisio-scraper/fetch_calendar_events_range.cjs
scripts/import-zenfisio-calendar-events.mjs
scripts/import-zenfisio-calendar-events-batch.mjs
scripts/zenfisio-scraper/data/calendar_events_20210701_20260802_raw.json
```

### 3.1 Correção TENS/tensão já feita

Havia um bug onde o termo `tensão` era classificado como procedimento `TENS`.

Causa provável:

- regra antiga usava `\b` do JavaScript;
- `\b` não trata acento como letra de forma adequada;
- por isso `tensão` podia casar como `tens` + fronteira antes de `ã`.

A regra correta deve usar fronteira Unicode:

```js
/(?<![\p{L}\p{N}_])tens(?![\p{L}\p{N}_])/iu
```

TENS só deve ser detectado quando aparecer como sigla isolada, por exemplo:

- `TENS`;
- `Tens Acup`;
- `TENS em quadril`;
- `TENS convencional`.

Nunca deve detectar TENS em:

- `tensão`;
- `tensao`;
- `intensidade`;
- `potencialmente`;
- qualquer substring dentro de palavra maior.

Validação feita anteriormente:

- sessões com procedimento nomeado `TENS`: 7.597;
- sessões com `TENS` sem a sigla explícita na observação: 0;
- caso do print `Alex Dias Velocity`: observação “a tensão em quadril melhorou” ficou sem TENS, mantendo só liberação miofascial + bota pneumática;
- sessão anterior que tinha linha real `TENS em quadril D` continuou com TENS corretamente.

Mesmo assim, nesta nova tarefa quero que você revalide e audite outros falsos positivos.

## 4. Objetivo principal desta nova conversa

Criar/melhorar uma feature de **Perfil Clínico estruturado** do paciente no MoocaFisio, usando os dados extraídos do ZenFisio.

A ideia é separar informações de avaliação/anamnese em campos específicos para facilitar decisões clínicas.

Quero que o fisioterapeuta consiga ver rapidamente:

- esportes praticados;
- frequência/intensidade quando existir;
- cirurgias anteriores;
- patologias/diagnósticos;
- medicamentos de uso contínuo;
- alergias;
- red flags/alertas;
- restrições e contraindicações;
- objetivos do paciente;
- resumo da avaliação/anamnese;
- dados brutos preservados para auditoria.

## 5. Primeiro passo obrigatório: mapear o schema atual

Antes de criar migration ou frontend novo, inspecione o que já existe.

Mapeie no código e no banco Neon:

- `patients`;
- `medical_records`;
- `patient_pathologies`;
- `patient_surgeries`;
- `patient_evaluation_responses`;
- `appointments`;
- `sessions`;
- qualquer tabela relacionada a avaliações, alertas clínicos, perfil do paciente, objetivos, flags, medicamentos, alergias.

Campos/tabelas que já foram identificados antes:

```text
patients.sports_practiced text[]
patients.pathologies_active text[]
patient_pathologies
patient_surgeries
patient_evaluation_responses
medical_records
medical_records.physical_activity
medical_records.previous_surgeries
medical_records.medical_history
medical_records.current_medications
medical_records.allergies
medical_records.lifestyle_habits
```

Confirme se isso ainda está correto no schema atual.

Use Neon/SQL para confirmar as colunas reais, tipos e constraints.

## 6. Só criar migration se realmente precisar

Se os campos existentes forem suficientes, use-os.

Se forem insuficientes, crie migrations no padrão do projeto:

- usar próximo número sequencial em `apps/api/migrations/`;
- criar `.down.sql` se for reversível/destrutivo;
- migration segura/idempotente quando possível;
- não apagar dados existentes;
- evitar lock pesado;
- usar `IF NOT EXISTS` quando aplicável;
- comentar a intenção da migration.

Possíveis campos/tabelas novas, se fizerem sentido:

### Perfil esportivo estruturado

Tabela ou JSON estruturado para:

- esporte;
- frequência semanal;
- intensidade;
- nível: recreativo / competitivo / profissional;
- objetivo: retorno ao esporte / performance / prevenção / dor / função;
- restrições relacionadas ao esporte;
- histórico de lesão esportiva;
- fonte: ZenFisio / manual / avaliação;
- confiança da extração.

### Cirurgias estruturadas

Campos/tabela para:

- tipo de cirurgia;
- segmento corporal;
- lateralidade;
- data da cirurgia;
- médico/cirurgião, se existir;
- fase pós-operatória;
- restrições/contraindicações;
- observações cirúrgicas;
- relação com tratamento atual;
- fonte/confiança.

### Patologias/diagnósticos estruturados

Campos/tabela para:

- diagnóstico principal;
- diagnósticos associados;
- segmento corporal;
- lateralidade;
- data/início;
- status: ativo / resolvido / histórico;
- fonte: relato do paciente / diagnóstico médico / exame / avaliação clínica;
- grau de confiança;
- observações.

### Alertas clínicos

Campos/tabela para:

- red flags;
- alergias;
- medicamentos contínuos;
- doenças sistêmicas;
- risco cardiovascular;
- restrições de carga/movimento;
- contraindicações;
- histórico familiar relevante;
- observações.

### Objetivos do paciente

Campos/tabela para:

- redução de dor;
- retorno ao esporte;
- retorno ao trabalho;
- melhora funcional;
- performance;
- prevenção;
- qualidade de vida;
- meta específica livre;
- status/progresso.

Não crie campos genéricos inúteis. Se criar algo, precisa estar conectado à tomada de decisão clínica e à UI.

## 7. Backend/API

Se usar ou criar novos campos, atualize backend/API para:

- listar no detalhe do paciente;
- atualizar manualmente quando necessário;
- preservar dados importados;
- distinguir fonte importada vs manual quando fizer sentido;
- não quebrar TypeScript strict;
- seguir os padrões existentes das rotas/schemas.

Procure APIs atuais de paciente/avaliação/evolução antes de implementar.

Arquivos candidatos a inspecionar:

```text
src/api/v2/patients.ts
src/schemas/patient.ts
apps/api/src/**
src/**/patients*
src/**/Patient*
src/**/Clinical*
src/**/Evaluation*
```

Não invente estrutura: confirme no repositório.

## 8. Frontend/UI

Criar ou melhorar uma área de visualização/edição do Perfil Clínico do paciente.

Pode ser:

- uma aba nova no paciente;
- um card/resumo no detalhe do paciente;
- uma seção dentro da avaliação inicial;
- um painel lateral no prontuário/evolução.

Escolha o que combina melhor com a arquitetura atual.

A UI deve facilitar ver:

- esportes praticados;
- cirurgias;
- patologias/diagnósticos;
- alertas clínicos;
- medicamentos/alergias;
- objetivos;
- resumo de avaliação/anamnese;
- origem dos dados, quando útil: `ZenFisio`, `manual`, `avaliação`.

Critérios de UI:

- português brasileiro;
- layout limpo e clínico;
- sem glassmorphism;
- usar componentes existentes do projeto;
- evitar refactor grande desnecessário.

## 9. Importação ZenFisio — avaliações/anamneses

Use os scripts e arquivos existentes como ponto de partida:

```text
scripts/zenfisio-scraper/scrape_evaluations_full_node.cjs
scripts/import-zenfisio-evaluations-structured.mjs
scripts/zenfisio-scraper/data/zenfisio-evaluations-full/evaluations_full.json
```

O scraper anterior:

- percorreu 1.017 pacientes;
- encontrou 29 links reais `/evaluations/edit/<id>`;
- extraiu 29 avaliações completas;
- falhou 0.

Importador anterior aplicou:

- 29 `patient_evaluation_responses`;
- 29 `medical_records`;
- 13 pacientes com esportes/patologias atualizados;
- 6 patologias estruturadas;
- 0 cirurgias positivas detectadas;
- 0 falhas.

Quero que você reavalie esse parser e melhore se necessário.

### 9.1 Regras de extração conservadora

Não quero parser burro por palavra-chave solta.

Regras:

- Sempre preserve o texto bruto completo da avaliação em `patient_evaluation_responses` ou `medical_records` para auditoria.
- Só grave campo estruturado se houver confiança razoável.
- Não transforme frase solta tipo `dor em joelho`, `desconforto`, `tensão`, `fadiga` automaticamente em patologia.
- Não grave cirurgia quando o texto for:
  - `não`;
  - `nega`;
  - `sem cirurgia`;
  - `nenhuma`.
- Não grave diabetes/hipertensão se o campo estiver marcado como `não`.
- Não grave alergia/medicação se o campo for `nega`, `não`, `sem`.
- Para esportes, prefira vocabulário reconhecido ou campo explicitamente chamado `Esporte`/`Atividade física`.
- Evite gravar lixo como `appointment_id`, `Bandeiras amarelas`, menus, boilerplate ou campos técnicos.

### 9.2 Exemplos esperados de esportes

Detectar corretamente:

- corrida;
- musculação;
- pilates;
- caminhada;
- futebol;
- tênis;
- ciclismo/bike;
- natação;
- crossfit;
- vôlei;
- basquete;
- luta / jiu-jitsu / muay thai / boxe / judô;
- yoga;
- dança.

Exemplos já validados antes:

- Andreza Carla Daher Pereira → corrida, musculação.
- Carlos Rodrigues → caminhada.
- Carol Vapsys → musculação, yoga.
- Déa Tânia Braga Miranda → musculação, pilates.
- Francisco Ivan da Silva → musculação, ciclismo.
- Isabella Colivat → corrida, musculação.
- Jéssica Calvacante → musculação, natação.
- Natan Vinicius Viera de Sousa → musculação, futebol, luta.
- Rafael Castanheira → corrida, musculação, ciclismo.
- Silvia Amaro → musculação, tênis.
- Thomas Meyer → caminhada, musculação.

### 9.3 Exemplos esperados de patologias/diagnósticos

Detectar com cuidado:

- hérnia de disco;
- endometriose;
- labirintite;
- fascite plantar;
- febre reumática;
- fratura;
- lesão de LCA;
- lesão meniscal;
- bursite;
- tendinopatia;
- condromalácia;
- artrose;
- escoliose;
- diabetes — somente se positivo;
- hipertensão — somente se positivo;
- doença respiratória — somente se positivo;
- doença vascular — somente se positivo.

Exemplos já importados antes:

- Carlos Rodrigues → Labirintite.
- Carol Vapsys → Hérnia de disco, Endometriose.
- Isabella Colivat → Fascite plantar.
- Jéssica Calvacante → Fratura, Febre reumática.

## 10. Auditoria de falsos positivos por substring

Além de TENS/tensão, faça uma auditoria de outras regras do classificador clínico que podem confundir substring.

Arquivo principal:

```text
scripts/classify-zenfisio-procedures-exercises.mjs
```

Procure:

- siglas curtas;
- nomes de recursos que podem aparecer dentro de palavras;
- regex com `\b` que pode falhar com acentos;
- uso de `.includes()` em termos clínicos curtos;
- termos que podem casar por substring dentro de palavra maior.

Regra recomendada para siglas/termos curtos:

```js
/(?<![\p{L}\p{N}_])TERMO(?![\p{L}\p{N}_])/iu
```

Não quebre casos reais.

Exemplos obrigatórios de teste:

```text
"tensão em quadril" → não deve gerar TENS
"tensao em quadril" → não deve gerar TENS
"intensidade da dor" → não deve gerar TENS
"TENS em quadril" → deve gerar TENS
"Tens Acup em quadril" → deve gerar TENS
"TENS convencional" → deve gerar TENS
```

Crie script de validação ou teste unitário se fizer sentido.

## 11. Validações obrigatórias no banco

Antes de finalizar, rode validações reais no Neon.

### 11.1 TENS

Validar:

- nenhuma sessão com `procedure.name === "TENS"` quando a observação não contém `TENS` isolado;
- casos com `tensão/tensao` e sem `TENS` isolado não podem ter procedimento `TENS`;
- casos com `TENS` isolado devem continuar preservados.

### 11.2 Avaliações/anamneses

Validar:

- total de avaliações ZenFisio extraídas;
- total de `patient_evaluation_responses` com `zenfisio_evaluation_id`;
- total de `medical_records` com source `zenfisio_evaluation_edit`;
- pacientes sem match;
- falhas.

### 11.3 Dados estruturados

Validar:

- pacientes com `sports_practiced` preenchido;
- pacientes com `pathologies_active` preenchido;
- registros em `patient_pathologies` criados pela importação;
- registros em `patient_surgeries` criados pela importação;
- amostras por paciente.

### 11.4 Idempotência

Reexecutar dry-run/importador depois de aplicar e garantir:

- nenhuma nova patologia pendente;
- nenhuma cirurgia pendente indevida;
- nenhum paciente pendente para atualizar por diferença artificial;
- falhas = 0.

Se `medical_records`/`responses` aparecem como upsert porque o script sempre sincroniza, explique isso claramente.

## 12. Validações de código

Antes de finalizar:

```bash
node -c scripts/classify-zenfisio-procedures-exercises.mjs
node -c scripts/zenfisio-scraper/scrape_evaluations_full_node.cjs
node -c scripts/import-zenfisio-evaluations-structured.mjs
```

Se alterar frontend/backend, rode também o que for relevante:

```bash
pnpm run test
pnpm run lint
pnpm run build
```

Se algum comando for inviável por tempo/erro externo, explique exatamente.

## 13. Entrega final esperada

Ao final, responda em português com:

1. O que foi implementado.
2. Quais migrations foram criadas, se houver.
3. Quais arquivos foram alterados/criados.
4. Quais dados foram importados.
5. Contagens finais:
   - avaliações processadas;
   - pacientes encontrados;
   - pacientes atualizados;
   - esportes importados;
   - patologias importadas;
   - cirurgias importadas;
   - alertas/medicações/alergias importadas;
   - falhas.
6. Validação TENS/tensão.
7. Validação de idempotência.
8. Amostras de pacientes com campos preenchidos.
9. Limitações/restos encontrados.
10. Próxima etapa recomendada.

## 14. Observação importante sobre qualidade clínica

Priorize qualidade e precisão acima de volume.

É melhor importar menos campos estruturados com alta confiança do que encher o cadastro com falso positivo.

Sempre preserve o texto bruto completo da avaliação/anamnese para auditoria clínica.

---

Fim do prompt.
