# Spec: Refatoração de Layout & Aplicação do Claude Design System no FisioFlow

**Data**: 25/07/2026  
**Fonte de Verdade**: `FisioFlow Design System-handoff.zip` (Claude Design)  
**Escopo**: Implementação global das diretrizes visuais e refatoração de leiautes no aplicativo Web do FisioFlow.

---

## 1. Diretrizes Canônicas do Design System (Claude Design)

### 🎨 1.1 Cores & Tokens
- **Azul Activity (`#0080FF` / `hsl(211 100% 50%)`)**: Cor primária oficial da marca. Usada com parcimônia (ações primárias, focos, estados ativos, badges críticas).
- **Proibição de Roxo/Violeta**: Remoção total de tons roxos ou violetas soltos (como `bg-indigo-50`, `bg-purple-*`).
- **Dominância Neutra**: Neutros frios HSL matiz 220° (`bg-background`, `bg-card`, `border-border/60`). Sem gradientes decorativos em fundos largos.
- **Bordas & Sombras**: Bordas finas de 1px (`border-border/60`). Cards primariamente flat, com elevação (`shadow-md` + `-translate-y-px`) apenas no hover.
- **Raio de Arredondamento**: Base generosa de 16px (`rounded-2xl` ou `rounded-[16px]`).

### ✍️ 1.2 Tipografia & Redação
- **Fonte Primária**: Nunito (pesos 300–900).
- **Caixa de Texto**: 
  - `MAIÚSCULAS` com letter-spacing para navegação lateral e agrupadores de seção.
  - `Title Case` para títulos de página e cards.
  - `Sentence case` em Português (Brasil) para descrições.
- **Zero Emojis na UI**: Substituição total de emojis por ícones vetoriais `lucide-react`.

---

## 2. Refatorações por Módulo do Sistema

### Módulo 1: Central de Inteligência & IA (`/inteligencia`)
- **Status**: Concluído (Fase 1).
- **Diretriz**: Navegação unificada pelo `IntelligenceCommandDeck` sem duplicidade de abas, sem cabeçalhos empilhados e com alinhamento neutro + Azul Activity.

### Módulo 2: Central Fisioterapêutica (`/fisioterapia` / `PhysiotherapyHub.tsx`)
- **Ação**: Modernizar o `PhysiotherapyHub` substituindo as abas simples de texto por um **Command Deck Clínico** de 3 blocos (Avaliação Postural, Plano de Tratamento, Progresso & Metas), seguindo o layout do handoff `evolucao-sessao/Layout A - Workspace.html`.

### Módulo 3: Biblioteca de Exercícios & Protocolos (`/exercicios`, `/protocolos`)
- **Ação**: Alinhar o cabeçalho e estatísticas numéricas ao padrão do handoff ("351 exercícios · 211 com vídeo · 50 templates"). Reformular os cards de exercício para borda 1px flat com hover suave `shadow-md` e badges de categoria em maiúsculas sem emoji.

### Módulo 4: Prontuário & Evolução Clínica (`/prontuario`, `/evolucao`)
- **Ação**: Integrar a visualização da linha do tempo clínica baseada em `protocolo-detalhe/Opção B - Linha do tempo.html` e `Layout D - Nota clínica.html`.

### Módulo 5: CRM & WhatsApp (`/crm`)
- **Ação**: Padronizar as abas e badges do Kanban de leads para a paleta canônica (Azul Activity para em atendimento, Verde para convertido, Âmbar para aguardando), eliminando ícones e emojis soltos em botões.

---

## 3. Plano de Verificação

1. **Validação de Compilação**: `npx tsc --noEmit` sem erros.
2. **Validação de Lint**: `npx eslint` em todos os arquivos modificados.
3. **Teste de Regressão Visual**: Verificação do layout responsivo de 360px até 1920px.
