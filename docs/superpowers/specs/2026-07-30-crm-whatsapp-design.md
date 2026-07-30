# Revisão visual do CRM · WhatsApp

## Objetivo

Alinhar o CRM · WhatsApp ao design system FisioFlow/Activity sem alterar conversas, automações, integrações, rotas, contratos de dados ou permissões existentes.

## Escopo

- Preservar as áreas atuais de lista de conversas, conversa ativa e contexto lateral.
- Substituir gradientes decorativos, superfícies premium e sombras permanentes por fundo neutro, cards planos, bordas sutis e raio base de 16 px.
- Usar azul Activity somente para ação primária, foco e estado ativo; status continuam semânticos.
- Priorizar no cabeçalho título, contagem operacional e ações necessárias.
- Tornar a lista de conversas densa e escaneável, com estado, badge e prévia claros.
- Organizar o contexto lateral em dados do paciente/lead, próximo agendamento e automações.
- Preservar busca, filtros, tabs, seleção de conversa, envio de mensagens e automações.

## Estados e acessibilidade

- Carregamento mantém skeletons proporcionais ao layout final.
- Estados de conversa não selecionada, sem resultados e falha de carregamento usam mensagens distintas e ação segura quando disponível.
- Controles têm nome acessível, foco visível e ordem de teclado coerente.
- Layout mantém a usabilidade em viewport reduzido, sem esconder ações críticas.

## Limites

- Não alterar API, webhooks, filas, integrações WhatsApp, modelo de dados, regras de automação ou permissões.
- Não criar recursos novos nem reestruturar estado do módulo.

## Arquivos previstos

- `src/pages/CrmWhatsApp.tsx`
- Componentes diretamente renderizados por essa página, apenas quando necessários para o alinhamento visual.

## Verificação

1. Typecheck e lint passam.
2. Seleção de conversa, busca/filtros, envio e automações mantêm o comportamento atual.
3. Estados vazio, carregando e erro continuam utilizáveis.
4. Não há gradientes decorativos, glassmorphism ou sombras persistentes fora dos casos permitidos pelo design system.
