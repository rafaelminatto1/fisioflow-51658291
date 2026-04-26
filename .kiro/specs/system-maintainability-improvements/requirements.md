# Documento de Requisitos

## Introdução

O FisioFlow é um sistema maduro de gestão de clínicas de fisioterapia com uma base de código extensa: mais de 200 hooks customizados, 36+ endpoints de API, múltiplas camadas de serviço e um sistema de tipos complexo. À medida que o sistema cresce, inconsistências arquiteturais acumuladas aumentam a probabilidade de erros e dificultam a adição de novas funcionalidades.

Esta especificação define os requisitos para um conjunto de melhorias de manutenibilidade e arquitetura que visam:

1. **Reduzir a probabilidade de erros** — padronizando contratos, validações e tratamento de erros
2. **Melhorar a manutenibilidade** — eliminando duplicações, centralizando configurações e clarificando responsabilidades
3. **Melhorar a arquitetura geral** — estabelecendo padrões consistentes que facilitem a evolução do sistema

As melhorias são organizadas em áreas temáticas e priorizadas por impacto e risco.

---

## Glossário

- **Service Layer**: Camada de serviços em `src/services/` que encapsula a lógica de negócio e acesso a dados
- **API Client**: Camada de clientes HTTP em `src/api/v2/` que faz chamadas ao backend
- **Hook**: Custom React hook em `src/hooks/` que integra dados e estado com componentes React
- **Query Key**: Identificador único usado pelo TanStack Query para cachear e invalidar dados
- **AppError**: Classe de erro padronizada em `src/lib/errors/AppError.ts`
- **Schema Zod**: Definição de validação de dados usando a biblioteca Zod
- **Domain Type**: Tipo TypeScript que representa uma entidade do domínio (Patient, Appointment, etc.)
- **Snake_case**: Convenção de nomenclatura com underscores (ex: `birth_date`, `created_at`) — usada no banco de dados
- **CamelCase**: Convenção de nomenclatura com maiúsculas (ex: `birthDate`, `createdAt`) — usada no frontend
- **Barrel Export**: Arquivo `index.ts` que re-exporta símbolos de múltiplos módulos
- **Silent Fail**: Padrão de capturar erros sem tratamento ou log adequado
- **Invariante**: Condição que deve ser sempre verdadeira para um dado ou operação ser válido
- **PBT**: Property-Based Testing — técnica de teste que verifica propriedades para entradas geradas automaticamente

---

## Requisitos

### Requisito 1: Padronização da Camada de Serviços

**User Story:** Como desenvolvedor, quero que todos os serviços sigam o mesmo padrão de implementação, para que eu possa entender e modificar qualquer serviço sem precisar aprender uma convenção diferente a cada vez.

#### Critérios de Aceitação

1. THE Service_Layer SHALL expor todos os serviços de domínio como objetos com métodos nomeados (padrão objeto literal), eliminando a mistura atual entre classes estáticas (`AppointmentService`) e objetos literais (`PatientService`).

2. WHEN um método de serviço é chamado, THE Service_Layer SHALL retornar um resultado tipado com a interface `ServiceResult<T>` definida em `src/types/common.ts`, contendo `{ data: T | null; error: Error | null }`.

3. THE Service_Layer SHALL separar a responsabilidade de mapeamento de dados (snake_case → camelCase) em funções puras e testáveis, isoladas da lógica de negócio.

4. IF um método de serviço recebe parâmetros inválidos, THEN THE Service_Layer SHALL lançar um `AppError.badRequest()` com mensagem descritiva antes de fazer qualquer chamada à API.

5. THE Service_Layer SHALL incluir JSDoc com `@param`, `@returns` e `@throws` para todos os métodos públicos.

---

### Requisito 2: Centralização e Tipagem de Query Keys

**User Story:** Como desenvolvedor, quero que todas as query keys do TanStack Query sejam definidas em um único lugar tipado, para que eu não precise procurar em múltiplos arquivos qual é a chave correta para invalidar um cache.

#### Critérios de Aceitação

1. THE Query_Key_Registry SHALL centralizar todas as query keys do sistema no arquivo `src/hooks/queryKeys.ts`, eliminando strings literais espalhadas nos hooks.

2. WHEN um hook precisa de uma query key, THE Query_Key_Registry SHALL fornecer a chave via funções tipadas que retornam `readonly` arrays, garantindo que o TypeScript detecte usos incorretos.

3. THE Query_Key_Registry SHALL organizar as chaves em namespaces por domínio (patients, appointments, financial, etc.) com hierarquia consistente: `[domínio, operação, ...parâmetros]`.

4. FOR ALL query keys no sistema, THE Query_Key_Registry SHALL garantir que chaves de lista sejam prefixos das chaves de detalhe correspondente, permitindo invalidação em cascata correta.

5. WHEN uma query key é invalidada, THE Query_Key_Registry SHALL garantir que todas as queries relacionadas (lista e detalhe) sejam invalidadas corretamente através da hierarquia de chaves.

---

### Requisito 3: Eliminação de Tipos Duplicados e Campos Redundantes

**User Story:** Como desenvolvedor, quero que cada conceito do domínio tenha uma única definição de tipo canônica, para que eu não precise decidir qual dos múltiplos tipos usar ao escrever código novo.

#### Critérios de Aceitação

1. THE Type_System SHALL definir um único tipo canônico para cada entidade de domínio (Patient, Appointment, Exercise, etc.), eliminando as definições duplicadas atualmente espalhadas entre `src/types/index.ts`, `src/types/appointment.ts`, `src/types/agenda.ts` e outros arquivos.

2. THE Type_System SHALL usar campos em camelCase como canônicos no frontend, com campos snake_case presentes apenas em tipos de banco de dados (`PatientRow`, `AppointmentRow`) definidos em `src/types/workers.ts`.

3. WHEN um tipo de banco de dados precisa ser convertido para o tipo de aplicação, THE Type_System SHALL fornecer uma função de mapeamento pura e testável que converta todos os campos de forma determinística.

4. THE Type_System SHALL eliminar campos duplicados como `name`/`full_name`, `birthDate`/`birth_date`, `createdAt`/`created_at` do tipo `Patient`, mantendo apenas a versão camelCase canônica.

5. IF um tipo de domínio é exportado, THEN THE Type_System SHALL exportá-lo exclusivamente através do barrel export `src/types/index.ts`, evitando importações diretas de arquivos internos.

---

### Requisito 4: Padronização do Tratamento de Erros

**User Story:** Como desenvolvedor, quero que todos os erros sejam tratados de forma consistente e rastreável, para que eu possa diagnosticar problemas em produção sem precisar adivinhar onde o erro foi silenciado.

#### Critérios de Aceitação

1. THE Error_Handler SHALL processar todos os erros capturados em blocos `catch` usando `AppError.from(error, context)` antes de relançar ou logar, garantindo que o contexto de origem seja sempre preservado.

2. WHEN um erro ocorre em um serviço, THE Error_Handler SHALL logar o erro com nível e contexto adequados usando `fisioLogger` antes de propagar o erro para a camada superior.

3. THE Error_Handler SHALL eliminar todos os padrões de "silent fail" (`catch { /* silent fail */ }`) substituindo-os por logs de warning com contexto suficiente para diagnóstico.

4. IF uma operação de auditoria falha, THEN THE Error_Handler SHALL logar o erro de auditoria como warning sem bloquear o fluxo principal da operação.

5. THE Error_Handler SHALL distinguir entre erros operacionais (esperados, como validação) e erros de programação (inesperados, como null pointer), usando `isOperational: true/false` no `AppError`.

6. WHEN um hook React captura um erro de mutação, THE Error_Handler SHALL exibir uma mensagem de erro amigável ao usuário via toast, com texto diferente para erros de rede versus erros de validação.

---

### Requisito 5: Validação de Dados na Fronteira da API

**User Story:** Como desenvolvedor, quero que todos os dados recebidos da API sejam validados com schemas Zod antes de serem usados, para que erros de contrato de API sejam detectados imediatamente e não causem falhas silenciosas em componentes distantes.

#### Critérios de Aceitação

1. THE API_Validator SHALL validar todos os dados recebidos da API usando schemas Zod definidos em `src/schemas/`, antes de passá-los para a camada de serviços.

2. WHEN a validação de um item falha, THE API_Validator SHALL logar o erro de validação com o ID do item e os campos inválidos, e excluir o item inválido da lista retornada (comportamento atual do AppointmentService que deve ser padronizado).

3. THE API_Validator SHALL definir schemas separados para: dados de criação (sem `id`, `created_at`), dados de atualização (todos os campos opcionais), e dados de resposta (com `id` obrigatório).

4. FOR ALL schemas de entidades de domínio, THE API_Validator SHALL incluir validação de invariantes de negócio: nível de dor entre 0 e 10, datas no formato ISO 8601, UUIDs válidos para IDs.

5. WHERE a validação estrita causaria rejeição de dados legítimos com campos extras, THE API_Validator SHALL usar `.passthrough()` ou `.strip()` de forma explícita e documentada.

---

### Requisito 6: Separação de Responsabilidades nos Hooks

**User Story:** Como desenvolvedor, quero que cada hook tenha uma responsabilidade única e bem definida, para que eu possa reutilizar lógica de dados sem precisar carregar lógica de UI junto.

#### Critérios de Aceitação

1. THE Hook_Architecture SHALL separar hooks de dados (fetching, mutations, cache) de hooks de estado de UI (seleção, filtros, modais), seguindo o padrão já estabelecido em `src/hooks/appointments/`.

2. WHEN um hook de dados é criado, THE Hook_Architecture SHALL usar exclusivamente as query keys do `QueryKeys` registry, sem strings literais.

3. THE Hook_Architecture SHALL garantir que hooks de dados não importem componentes React ou hooks de UI, mantendo a separação de camadas.

4. IF um hook precisa de lógica de negócio complexa, THEN THE Hook_Architecture SHALL delegar essa lógica para o serviço correspondente em `src/services/`, mantendo o hook como uma camada fina de integração React.

5. THE Hook_Architecture SHALL documentar cada hook com JSDoc incluindo: propósito, parâmetros, retorno e exemplo de uso.

---

### Requisito 7: Invariantes de Domínio e Validação de Negócio

**User Story:** Como desenvolvedor, quero que as regras de negócio do domínio sejam verificadas de forma centralizada e testável, para que eu não precise duplicar validações em múltiplos lugares e possa confiar que dados inválidos nunca chegam ao banco de dados.

#### Critérios de Aceitação

1. THE Domain_Validator SHALL centralizar todas as validações de invariantes de negócio em funções puras em `src/lib/validation/`, separadas dos schemas Zod de formato.

2. WHEN um agendamento é criado ou atualizado, THE Domain_Validator SHALL verificar que: a data não está no passado (para novos agendamentos), a duração está entre 15 e 480 minutos, e o horário está dentro do horário de funcionamento configurado.

3. WHEN um registro de dor é criado, THE Domain_Validator SHALL verificar que o nível de dor é um inteiro entre 0 e 10 inclusive.

4. FOR ALL validações de domínio, THE Domain_Validator SHALL retornar um resultado tipado `{ valid: boolean; errors: string[] }` em vez de lançar exceções, permitindo acumulação de múltiplos erros.

5. THE Domain_Validator SHALL ser testável com property-based testing: para qualquer entrada gerada aleatoriamente, a validação deve ser determinística e não lançar exceções inesperadas.

---

### Requisito 8: Organização e Documentação de Constantes

**User Story:** Como desenvolvedor, quero que todas as constantes do sistema estejam organizadas em um único lugar por domínio, para que eu não precise procurar em múltiplos arquivos qual é o valor correto de um status ou configuração.

#### Critérios de Aceitação

1. THE Constants_Registry SHALL centralizar todas as constantes de domínio (status de agendamento, roles de usuário, tipos de pagamento, etc.) em `src/lib/constants/`, organizadas por domínio.

2. THE Constants_Registry SHALL usar `as const` e tipos derivados (`typeof APPOINTMENT_STATUSES[number]`) para garantir que o TypeScript infira os tipos literais corretos.

3. WHEN um componente ou serviço precisa de um valor de status ou tipo, THE Constants_Registry SHALL fornecer o valor via importação tipada, eliminando strings literais espalhadas no código.

4. THE Constants_Registry SHALL incluir mapeamentos de exibição (ex: `{ scheduled: "Agendado", confirmed: "Confirmado" }`) junto com os valores canônicos, evitando duplicação de lógica de formatação.

5. IF uma constante é usada tanto no frontend quanto no backend, THEN THE Constants_Registry SHALL defini-la no pacote compartilhado `packages/shared-constants/`, garantindo consistência entre as camadas.

---

### Requisito 9: Cobertura de Testes para Lógica Crítica

**User Story:** Como desenvolvedor, quero que as funções de mapeamento, validação e lógica de negócio críticas tenham testes automatizados, para que eu possa refatorar com confiança sabendo que os testes detectarão regressões.

#### Critérios de Aceitação

1. THE Test_Suite SHALL cobrir todas as funções de mapeamento de dados (snake_case → camelCase) com testes unitários que verificam a transformação correta de cada campo.

2. THE Test_Suite SHALL cobrir todas as funções de validação de domínio com property-based tests usando fast-check, verificando que: entradas válidas sempre passam, entradas inválidas sempre falham, e a validação é determinística.

3. WHEN uma função de mapeamento recebe um campo nulo ou indefinido, THE Test_Suite SHALL verificar que a função retorna o valor padrão correto sem lançar exceções.

4. THE Test_Suite SHALL cobrir os serviços críticos (PatientService, AppointmentService, FinancialService) com testes de integração que mockam a camada de API.

5. FOR ALL schemas Zod de domínio, THE Test_Suite SHALL incluir testes de round-trip: `parse(serialize(entity)) === entity` para garantir que serialização e deserialização são inversas.

---

### Requisito 10: Rastreabilidade e Observabilidade

**User Story:** Como desenvolvedor, quero que o sistema produza logs estruturados e rastreáveis em todas as operações críticas, para que eu possa diagnosticar problemas em produção sem precisar reproduzir o ambiente.

#### Critérios de Aceitação

1. THE Logger SHALL usar `fisioLogger` de forma consistente em todos os serviços e hooks, eliminando o uso direto de `console.log`, `console.error` e `console.warn` no código de produção.

2. WHEN uma operação de serviço é iniciada, THE Logger SHALL registrar um log de nível `debug` com o nome da operação e os parâmetros relevantes (sem dados sensíveis como CPF ou senha).

3. WHEN uma operação de serviço falha, THE Logger SHALL registrar um log de nível `error` com o contexto completo: nome da operação, ID da entidade afetada, e a mensagem de erro.

4. THE Logger SHALL incluir um `correlationId` em todos os logs de uma mesma requisição, permitindo rastrear o fluxo completo de uma operação através das camadas.

5. IF dados sensíveis precisam ser logados para diagnóstico, THEN THE Logger SHALL mascarar os dados (ex: mostrar apenas os primeiros 3 caracteres do CPF) antes de registrar o log.

