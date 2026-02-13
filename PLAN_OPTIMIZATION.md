# Planejamento de Otimização e Melhoria de UX/UI - FisioFlow

Este plano detalha as ações para tornar o carregamento inicial mais rápido, reduzir o ruído de logs no console e melhorar a experiência do usuário com humor e design moderno.

## 1. Otimização de Performance (Carregamento Inicial)

### 1.1. Paralelização de Inicialização (main.tsx)
- **Status Atual**: Alguns serviços são inicializados sequencialmente ou bloqueiam o render inicial.
- **Ação**: Utilizar `Promise.allSettled` para serviços não críticos (Sentry, Performance, Remote Config) para não bloquear o `createRoot`.
- **Pre-fetching**: Iniciar a restauração do cache do Query Client o mais cedo possível.

### 1.2. Redução do Waterfall de Providers (App.tsx)
- **Status Atual**: Muitos contextos aninhados (`Auth` -> `FeatureFlag` -> `Realtime` -> `Data`).
- **Ação**: Identificar dependências e achatar a hierarquia onde possível. Implementar carregamento lazy de providers que não são necessários imediatamente.

### 1.3. Otimização de Assets
- **Ação**: Garantir que o splash screen no `index.html` use imagens em AVIF/WebP e fontes críticas sejam pré-carregadas (`link rel="preload"`).

---

## 2. Redução de Logs (Console Noise)

### 2.1. Ajuste de Nível de Log (logger.ts)
- **Ação**: Alterar o nível padrão de `info` para `warn` em ambientes de desenvolvimento, a menos que explicitamente configurado via `VITE_LOG_LEVEL`.
- **Ação**: Implementar filtros por componente ou categoria para silenciar logs repetitivos de infraestrutura.

---

## 3. Revitalização de UX/UI (Loading & Erros)

### 3.1. Novo Splash Screen (index.html)
- **Design**: Substituir o spinner genérico por algo mais temático (ex: um boneco articulado ou um "osso" carregando).
- **Humor**: Adicionar um carrossel de "Piadas de Fisioterapeuta" para entreter durante o carregamento.

### 3.2. AppLoadingSkeleton (React)
- **Ação**: Sincronizar as piadas com o splash screen do HTML para uma transição suave.
- **Micro-interações**: Adicionar animações que lembram movimentos de fisioterapia (ex: flexão/extensão).

### 3.3. Página 404 e Erros (NotFound.tsx)
- **Design**: Layout mais visual com ilustrações temáticas.
- **Humor**: Frases como "Esta página está com escoliose: totalmente fora do lugar" ou "Página não encontrada. Já tentou fazer compressa de gelo?".

---

## 4. Curadoria de Piadas (Ortopedia/Fisio)

| Contexto | Piada / Frase |
| :--- | :--- |
| **Loading** | "Carregando... estamos apenas alongando a verdade um pouquinho." |
| **Loading** | "Resistência não é fútil, é fisioterapia!" |
| **Loading** | "Trabalhando na sua postura... digo, no seu sistema." |
| **404** | "Parece que esta página pegou um caminho errado. Talvez precise de treino de marcha?" |
| **404** | "Página não encontrada. Tentamos gelo por 20 minutos, mas não resolveu." |
| **Erro** | "O sistema teve um espasmo muscular. Vamos tentar uma liberação miofascial (recarregar)." |

---

## 5. Cronograma de Implementação

1. **Fase 1**: Ajuste do Logger e Redução de Logs (Imediato).
2. **Fase 2**: Refatoração do Splash Screen e `index.html`.
3. **Fase 3**: Implementação do sistema de piadas no `AppLoadingSkeleton` e `NotFound`.
4. **Fase 4**: Ajustes de performance no `main.tsx` e `App.tsx`.
