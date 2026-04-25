# Spec Técnica: Gestão de Pacientes com Filtros Clínicos, Operacionais e Financeiros

## 1. Visão Geral

A tela de pacientes em [src/pages/Patients.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Patients.tsx) hoje funciona principalmente como uma listagem com filtros limitados. Os cards de resumo do topo não filtram a lista de fato, o seletor de condições depende apenas dos dados presentes na página carregada e a classificação clínica/operacional/financeira do paciente não está organizada em domínios claros.

O objetivo desta entrega é transformar a página em um cockpit operacional de pacientes, com:

- cards superiores clicáveis que aplicam filtros reais;
- filtros clínicos, operacionais, financeiros e de origem com semântica consistente;
- textos mais claros na UI;
- base preparada para persistir classificações estruturadas como esporte, foco terapêutico, perfil assistencial e parceria;
- compatibilidade com a arquitetura atual sem quebrar pacientes que ainda não tenham os novos dados preenchidos.

## 2. Objetivos

- Fazer os cards do topo filtrarem a listagem de pacientes de forma real.
- Corrigir textos e rótulos ambíguos da interface atual.
- Separar `patologia`, `perfil assistencial`, `foco terapêutico`, `origem` e `financeiro` em eixos distintos.
- Permitir filtrar pacientes por:
  - patologia atual ou histórica;
  - status da patologia (`em tratamento`, `monitoramento`, `tratada/alta`, `histórico`);
  - esporte praticado;
  - pós-operatório;
  - liberação miofascial;
  - parceria/origem;
  - situação de pagamento.
- Manter o estado dos filtros sincronizado com a URL.
- Preparar o backend para servir uma listagem agregada com dados clínicos, operacionais e financeiros consolidados.

## 3. Estado Atual

- [src/components/patient/PatientsPageHeader.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/patient/PatientsPageHeader.tsx) atualiza `classification` na URL quando os cards do topo são clicados.
- [src/hooks/usePatientsPage.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/hooks/usePatientsPage.ts) não aplica `classification` na consulta principal, então os cards mudam o estado visual, mas não filtram os pacientes.
- [src/pages/patients/usePatientsUrlState.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/patients/usePatientsUrlState.ts) já carrega parte do estado da URL, mas a semântica dos filtros ainda é rasa.
- [apps/api/src/routes/patients.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/patients.ts) hoje suporta apenas filtros básicos como `status`, `search`, `condition` e `hasSurgery`.
- O dropdown de condições é derivado dos pacientes da página atual, o que faz o conjunto de opções variar artificialmente com paginação e filtros prévios.
- O modelo atual já possui dados relevantes para a evolução:
  - `patients.mainCondition`, `origin`, `referredBy`, `professionalId`;
  - `pathologies` como histórico clínico estruturado;
  - `surgeries` para cirurgia e contexto pós-operatório;
  - tabelas financeiras e `paymentStatus` para composição da situação de pagamento.

## 4. Problemas a Resolver

### 4.1 Funcionais

- Cards do topo sem efeito real sobre a lista.
- Filtro de condições com baixa utilidade e baixa confiabilidade.
- Dificuldade para diferenciar paciente que trata uma patologia hoje de paciente que já teve essa patologia no passado.
- Ausência de filtros financeiros de gestão do paciente.

### 4.2 Semânticos

- O rótulo `Todas condições` é genérico demais e mistura conceitos clínicos diferentes.
- `Finalizados` comunica menos que `Alta / Finalizados`.
- Falta distinção clara entre:
  - condição clínica;
  - perfil assistencial;
  - foco terapêutico;
  - origem/comercial;
  - situação financeira.

### 4.3 Técnicos

- Regras de classificação espalhadas entre frontend, URL e backend.
- Listagem sem uma projeção agregada pronta para o que a nova tela precisa renderizar.
- Facets e contadores ainda não são retornados por uma fonte única.

## 5. Escopo

### Incluído

- Tornar os cards superiores filtros reais e cumulativos com o restante da tela.
- Redesenhar a barra de filtros em grupos:
  - `Clínico`
  - `Operacional`
  - `Financeiro`
  - `Origem`
- Trocar textos genéricos por rótulos mais claros.
- Usar `pathologies` como fonte clínica oficial para filtro por patologia.
- Tratar `mainCondition` como resumo visível do caso, espelhando a patologia principal quando aplicável.
- Considerar filtros financeiros baseados em dados reais de faturamento/pagamento.
- Preparar persistência para `patient_sports`, `patient_therapy_focuses`, `patient_care_profiles` e relacionamento de parceria.
- Reestruturar a listagem para suportar badges clínicos, operacionais e financeiros.

### Fora de Escopo

- Reescrever o prontuário inteiro.
- Mudar a jornada completa de cadastro do paciente nesta entrega.
- Implementar analytics avançada preditiva além do essencial para `em risco`.
- Refatorar módulos não relacionados à página de pacientes.

## 6. Estrutura Visual Aprovada

Layout validado a partir do redesign gerado no Stitch para a tela `Gestão de Pacientes - FisioFlow`:

- header com título `Pacientes`, contagem total e CTA `Novo Paciente`;
- cards superiores clicáveis:
  - `Ativos`
  - `Novos`
  - `Em risco`
  - `Alta / Finalizados`
- cockpit central com busca e filtros principais;
- painel avançado por grupos lógicos;
- faixa de inteligência operacional;
- listagem híbrida card/tabela com chips e badges segmentados.

## 7. Taxonomia Oficial dos Filtros

### 7.1 Cards do topo

Os cards são atalhos de filtro e usam a mesma lógica do backend.

- `Ativos`
  - paciente com caso clínico ativo ou jornada assistencial ativa.
- `Novos`
  - paciente em onboarding recente ou sem sessões concluídas.
- `Em risco`
  - paciente sem agenda futura, com no-show recente ou recall pendente.
- `Alta / Finalizados`
  - paciente sem caso clínico ativo, com alta ou tratamento encerrado.

### 7.2 Grupo Clínico

- `Patologia`
- `Status da patologia`
  - `Em tratamento`
  - `Monitoramento`
  - `Tratada / Alta`
  - `Histórico`
- `Condição principal`
  - resumo do caso e não fonte primária de segmentação.
- `Perfil assistencial`
  - `Ortopédico`
  - `Esportivo`
  - `Pós-operatório`
  - `Prevenção`
  - `Idosos`
- `Esporte praticado`
- `Foco terapêutico`
  - `Liberação miofascial`
  - `Fortalecimento`
  - `Retorno ao esporte`
  - `Analgesia`
- `Com cirurgia`
- `Cirurgia recente`

### 7.3 Grupo Operacional

- `Status do paciente`
- `Sem agenda futura`
- `Com faltas / no-show`
- `Em waitlist`
- `Precisa recall`
- `Profissional responsável`
- `Cadastro incompleto`

### 7.4 Grupo Financeiro

- `Modelo de pagamento`
  - `Particular`
  - `Convênio`
  - `Parceria`
  - `Terceiro pagador`
- `Situação financeira`
  - `Adimplente`
  - `Saldo pendente`
  - `Em cobrança`
  - `Crédito`
  - `Não faturado`
- `Responsabilidade do saldo`
  - `Paciente`
  - `Convênio / seguradora`
- `Sessões aprovadas restantes`
- `Com pacote ativo`
- `Pagamento online pendente`

### 7.5 Grupo Origem

- `Parceria`
- `Indicação`
- `Orgânico`
- `Campanha`
- `Convênio`
- `Origem personalizada`

## 8. Regras de Combinação dos Filtros

- Entre grupos diferentes: lógica `AND`.
- Dentro do mesmo grupo multiselect: lógica `OR`.
- A busca textual complementa os filtros estruturados e deve buscar por:
  - nome;
  - telefone;
  - patologia;
  - parceiro;
  - profissional;
  - tag/chip relevante.

### Exemplos esperados

1. `Perfil assistencial = esportivo ou pós-operatório` + `Situação financeira = saldo pendente`.
2. `Patologia = LCA` + `Status da patologia = Tratada / Alta`.
3. `Parceria = Empresa X` + `Sem agenda futura`.

## 9. Regras de Patologia e Condição Principal

- `pathologies` passa a ser a fonte clínica oficial do filtro por patologia.
- `patients.mainCondition` continua existindo como resumo de leitura rápida.
- A patologia principal deve alimentar `mainCondition` quando houver vínculo confiável.
- O filtro por patologia deve permitir diferenciar:
  - quem está tratando;
  - quem está em monitoramento;
  - quem já tratou e recebeu alta;
  - quem tem apenas histórico.

Essa separação atende diretamente ao requisito de saber quem já teve determinada patologia e está de alta versus quem ainda está em tratamento.

## 10. Regras de Pós-Operatório, Esporte, Foco Terapêutico e Parceria

- `Pós-operatório` não deve ser inferido apenas por “teve cirurgia”; ele deve existir como perfil assistencial ativo.
- `Com cirurgia` e `Cirurgia recente` continuam sendo filtros independentes, derivados de `surgeries`.
- `Esporte praticado` deve ser multiselect, pois o paciente pode praticar mais de um esporte.
- `Foco terapêutico` é distinto de patologia e de perfil assistencial.
- `Liberação miofascial` entra como foco terapêutico estruturado, não como texto livre.
- `Parceria` deve apontar para uma entidade/parceiro estruturado quando existir, e não somente para texto em origem.

## 11. Revisão dos Textos da UI

### 11.1 Textos a corrigir

- `Todas condições` -> separar em filtros específicos, sem um guarda-chuva genérico.
- `Finalizados` -> `Alta / Finalizados`.
- `Mais recentes` permanece aceitável, mas deve coexistir com novas ordenações úteis.

### 11.2 Textos recomendados para a nova barra

- `Patologia`
- `Status da patologia`
- `Perfil assistencial`
- `Esporte praticado`
- `Foco terapêutico`
- `Situação financeira`
- `Modelo de pagamento`
- `Origem`

### 11.3 Estado vazio

- Sem pacientes cadastrados
- Nenhum paciente corresponde aos filtros aplicados
- Nenhum paciente em risco no critério atual

## 12. Badges e Sinais na Listagem

### 12.1 Badges clínicos

- `Esportivo`
- `Pós-operatório`
- `Liberação miofascial`
- `Cirurgia recente`

### 12.2 Badges operacionais

- `Recall`
- `Waitlist`
- `Sem agenda`
- `No-show`

### 12.3 Badges financeiros

- `Adimplente`
- `Saldo pendente`
- `Crédito`
- `Em cobrança`
- `Não faturado`

Se o usuário não tiver permissão financeira, a UI pode mostrar o status qualitativo, mas não deve expor valores monetários.

## 13. Arquitetura Recomendada

### 13.1 Fonte única da listagem

Criar uma projeção agregada de diretório de pacientes, chamada aqui de `patient_directory_row`, exposta por endpoint ou camada de query no backend. Essa projeção deve devolver os dados necessários para a listagem sem depender de múltiplas composições no frontend.

Campos esperados na projeção:

- identidade e contato;
- status do paciente;
- patologia principal;
- histórico patológico resumido;
- perfis assistenciais;
- esportes;
- focos terapêuticos;
- cirurgia / cirurgia recente;
- agenda futura;
- última atividade;
- flags de recall / waitlist / no-show;
- situação financeira consolidada;
- origem e parceria;
- profissional responsável.

### 13.2 Centralização de regras

As regras de classificação para `Ativos`, `Novos`, `Em risco`, `Alta / Finalizados` e `Situação financeira` devem ser centralizadas no backend, e não reimplementadas separadamente no frontend.

### 13.3 Fonte de dados por domínio

- `patients`: ficha-resumo do paciente.
- `pathologies`: verdade clínica principal.
- `surgeries`: cirurgia e contexto de pós-operatório.
- `appointments` e agenda: agenda futura, inatividade, no-show.
- financeiro: contas, pagamentos, pacotes e convênios.

## 14. Persistência Recomendada

### 14.1 Reaproveitamento imediato

- `patients.mainCondition`
- `patients.origin`
- `patients.referredBy`
- `patients.professionalId`
- `pathologies`
- `surgeries`
- `appointments.paymentStatus` e tabelas financeiras já existentes

### 14.2 Novos domínios estruturados

- `patient_sports`
- `patient_therapy_focuses`
- `patient_care_profiles`
- relacionamento estruturado com parceria/empresa

Esses dados devem ser opcionais na primeira fase para não bloquear rollout em bases já existentes.

## 15. Comportamento Esperado da Tela

### 15.1 Cards

- Clique no card aplica o filtro.
- Segundo clique remove o filtro.
- O card ativo precisa refletir o estado da listagem.

### 15.2 Ordenação

Manter:

- `Mais recentes`
- `Mais antigos`
- `Nome`
- `Patologia`

Adicionar:

- `Próxima sessão`
- `Última atividade`
- `Maior saldo pendente`
- `Maior risco`

### 15.3 Ações rápidas por paciente

- abrir prontuário;
- agendar próxima sessão;
- cobrar / registrar pagamento;
- adicionar à waitlist;
- disparar recall;
- abrir WhatsApp.

## 16. Estratégia de Rollout

### Fase 1: Correção do núcleo atual

- Fazer os cards filtrarem a lista de verdade.
- Corrigir textos principais.
- Parar de gerar `Condições` a partir apenas da página atual.

### Fase 2: Cockpit oficial de filtros

- Introduzir os grupos `Clínico`, `Operacional`, `Financeiro` e `Origem`.
- Ligar a listagem a uma fonte agregada única.

### Fase 3: Domínios estruturados novos

- Persistir esportes, focos terapêuticos, perfil assistencial e parceria.
- Expor novas opções reais de filtro.

### Fase 4: Refinamento operacional

- Melhorar badges, insights, ordenações de risco e sinais financeiros.

## 17. Estratégia de Validação

### 17.1 Regras de filtro

Validar:

- `AND` entre grupos;
- `OR` dentro do grupo;
- toggle dos cards;
- limpeza total de filtros;
- sincronização com URL.

### 17.2 Cenários de dados

Cobrir ao menos:

- paciente com patologia ativa;
- paciente com histórico de patologia e alta;
- paciente pós-operatório;
- paciente com parceria;
- paciente com saldo pendente;
- paciente com crédito;
- paciente não faturado;
- paciente sem agenda futura.

### 17.3 UI e permissão

Validar:

- recarregar a página preserva filtros;
- contadores e lista respondem ao mesmo filtro;
- perfis sem permissão financeira não visualizam valores.

## 18. Arquivos Inicialmente Impactados

- [src/pages/Patients.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Patients.tsx)
- [src/components/patient/PatientsPageHeader.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/patient/PatientsPageHeader.tsx)
- [src/hooks/usePatientsPage.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/hooks/usePatientsPage.ts)
- [src/pages/patients/usePatientsUrlState.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/patients/usePatientsUrlState.ts)
- [src/components/patient/PatientAdvancedFilters.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/patient/PatientAdvancedFilters.tsx)
- [src/api/v2/patients.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/api/v2/patients.ts)
- [apps/api/src/routes/patients.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/patients.ts)

## 19. Riscos e Mitigações

- **Risco:** termos como `ativo`, `alta`, `em risco` e `não faturado` ficarem inconsistentes entre telas.
  - **Mitigação:** centralizar semântica no backend.

- **Risco:** novos filtros visuais serem adicionados sem persistência adequada.
  - **Mitigação:** separar claramente o que é fase 1 derivada do modelo atual e o que exige novos domínios estruturados.

- **Risco:** dropdowns ficarem excessivos e difíceis de usar.
  - **Mitigação:** organizar por grupos e priorizar filtros mais usados no cockpit principal.

## 20. Resultado Esperado

Ao final da implementação:

- a tela de pacientes deixa de ser apenas uma listagem e passa a ser um centro operacional;
- os cards superiores funcionam como filtros reais;
- a taxonomia dos filtros passa a refletir a realidade clínica, operacional e financeira;
- a UI usa textos mais claros e menos ambíguos;
- o sistema suporta tanto o paciente em tratamento quanto o histórico de alta e o acompanhamento financeiro com consistência.
