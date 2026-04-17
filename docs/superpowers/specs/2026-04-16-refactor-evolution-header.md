# Design Spec: Novo Layout Superior da Evolução (Soft & Clean)

## Objetivo
Refatorar a parte superior da página de evolução para um layout mais leve, moderno e dinâmico, garantindo que seções sem dados ocupem o mínimo de espaço possível.

## Estética
- **Cores**: Branco puro (#FFFFFF), azul suave (FisioFlow Primary), cinzas claros para bordas.
- **Formas**: Bordas arredondadas generosas (radius-lg), sombras suaves.
- **Tipografia**: Hierarquia clara, usando azul para destaques e ícones.

## Componentes

### 1. DynamicContextBar
Substitui o grid de cards atual por uma linha de "Quick Actions / Status".
- Se houver dados (Cirurgias, Retornos, Metas): O item aparece como um card compacto e expansível.
- Se não houver dados: O item aparece como um "Chip" colapsado com um botão de adicionar.

### 2. Comportamento de Colapso (Accordion-style)
Cada seção (Cirurgias, Retornos, Metas) terá um estado `isCollapsed` por padrão se `data.length === 0`.
- O cabeçalho sempre será visível para permitir a adição de novos dados.
- O conteúdo só expande sob demanda ou se houver registros importantes (ex: retorno médico para hoje).

## Mudanças Técnicas
- Alterar `src/pages/PatientEvolution.tsx` para passar flags de estado para os cards.
- Refatorar `MedicalReturnCard`, `SurgeriesCard` e `MetasCard` para aceitar uma prop `collapsible`.
- Ajustar `EvolutionResponsiveLayout` para acomodar a nova barra dinâmica.

## Validação
- Verificar se o espaço vertical foi otimizado.
- Garantir que a usabilidade para adicionar novos registros não foi prejudicada.
