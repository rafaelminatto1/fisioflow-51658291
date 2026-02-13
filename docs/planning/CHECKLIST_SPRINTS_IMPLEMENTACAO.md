# Checklist de Implementação - Sprints Detalhados

## Roadmap Completo - 18 Semanas

---

## Fase 0: Fundação (Semanas 1-2)

### Sprint 0.1: Infraestrutura Base

**Objetivo:** Configurar monorepo e ferramentas base

| ID | Tarefa | Descrição | Responsável | Status |
|----|--------|-----------|-------------|--------|
| 0.1.1 | Criar conta Expo | Criar login em expo.dev | Dev | ⬜ |
| 0.1.2 | Instalar EAS CLI | `npm install -g eas-cli` | Dev | ⬜ |
| 0.1.3 | Configurar workspace | Criar estrutura de monorepo | Dev | ⬜ |
| 0.1.4 | Setup pnpm workspace | Configurar pnpm-workspace.yaml | Dev | ⬜ |
| 0.1.5 | Setup Turborepo | Configurar turbo.json | Dev | ⬜ |
| 0.1.6 | Criar projeto pacientes | `npx create-expo-app` | Dev | ⬜ |
| 0.1.7 | Criar projeto profissionais | `npx create-expo-app` | Dev | ⬜ |
| 0.1.8 | Configurar Firebase iOS | Adicionar apps no Firebase Console | Dev | ⬜ |
| 0.1.9 | Download GoogleServices-Info | Baixar plist files | Dev | ⬜ |
| 0.1.10 | Setup package shared-ui | Criar pacote de UI compartilhada | Dev | ⬜ |
| 0.1.11 | Setup package shared-api | Criar pacote de API | Dev | ⬜ |
| 0.1.12 | Setup package shared-types | Criar pacote de tipos | Dev | ⬜ |
| 0.1.13 | Setup package shared-utils | Criar pacote de utilitários | Dev | ⬜ |
| 0.1.14 | Configurar ESLint | Setup linting compartilhado | Dev | ⬜ |
| 0.1.15 | Configurar Prettier | Setup formatação de código | Dev | ⬜ |
| 0.1.16 | Configurar TypeScript | Setup tsconfig base | Dev | ⬜ |
| 0.1.17 | Criar .gitignore | Setup de ignores | Dev | ⬜ |
| 0.1.18 | Setup environment variables | Configurar .env.example | Dev | ⬜ |

**Entregáveis Sprint 0.1:**
- Monorepo configurado
- Projetos Expo criados
- Pacotes compartilhados estruturados
- CI/CD base configurado

---

### Sprint 0.2: EAS Build e Credenciais

**Objetivo:** Configurar build na nuvem

| ID | Tarefa | Descrição | Responsável | Status |
|----|--------|-----------|-------------|--------|
| 0.2.1 | EAS build:configure | Executar comando inicial | Dev | ⬜ |
| 0.2.2 | Configurar eas.json | Criar perfis de build | Dev | ⬜ |
| 0.2.3 | Configurar app.json pacientes | Metadata completa do app | Dev | ⬜ |
| 0.2.4 | Configurar app.json profissionais | Metadata completa do app | Dev | ⬜ |
| 0.2.5 | Gerar app-specific password | Criar senha Apple | Dev | ⬜ |
| 0.2.6 | Obter Apple Team ID | Verificar no Developer Portal | Dev | ⬜ |
| 0.2.7 | Configurar credenciais EAS | `eas credentials` | Dev | ⬜ |
| 0.2.8 | Primeiro build dev pacientes | `eas build --profile development` | Dev | ⬜ |
| 0.2.9 | Primeiro build dev profissionais | `eas build --profile development` | Dev | ⬜ |
| 0.2.10 | Testar build em dispositivo | Instalar IPA | Dev | ⬜ |
| 0.2.11 | Configurar GitHub Actions | Workflow de CI/CD | Dev | ⬜ |
| 0.2.12 | Setup TestFlight | Configurar app no ASC | Dev | ⬜ |
| 0.2.13 | Primeiro build preview | Teste beta | Dev | ⬜ |

**Entregáveis Sprint 0.2:**
- Primeiro build funcional
- CI/CD automatizado
- TestFlight configurado
- Deploy automatizado funcionando

---

## Fase 1: MVP Profissionais (Semanas 3-8)

### Sprint 1.1: Autenticação e Onboarding

**Objetivo:** Login/Registro e boas-vindas

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 1.1.1 | Tela de Splash | Splash screen com logo | 2 | ⬜ |
| 1.1.2 | Tela de Login | Email + senha + "Esqueci senha" | 3 | ⬜ |
| 1.1.3 | Tela de Registro | Formulário de cadastro | 3 | ⬜ |
| 1.1.4 | Login com Google | Integração Firebase Auth | 3 | ⬜ |
| 1.1.5 | Validação de formulários | React Hook Form + Zod | 2 | ⬜ |
| 1.1.6 | Recuperação de senha | Firebase Auth reset | 2 | ⬜ |
| 1.1.7 | Onboarding slides | 3-4 telas introdutórias | 3 | ⬜ |
| 1.1.8 | Persistência de login | Salvar sessão | 2 | ⬜ |
| 1.1.9 | Contexto de autenticação | AuthProvider + hook | 3 | ⬜ |
| 1.1.10 | Loading states | Skeletons durante auth | 1 | ⬜ |
| 1.1.11 | Error handling | Toasts de erro | 2 | ⬜ |
| 1.1.12 | Testes E2E | Playwright auth flows | 3 | ⬜ |

**Total Sprint:** 32 Story Points

---

### Sprint 1.2: Gestão de Pacientes

**Objetivo:** CRUD completo de pacientes

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 1.2.1 | Lista de pacientes | Cards com info básica | 3 | ⬜ |
| 1.2.2 | Busca de pacientes | Filtro por nome/email/phone | 3 | ⬜ |
| 1.2.3 | Filtro por status | Ativos vs inativos | 2 | ⬜ |
| 1.2.4 | Ordenação | Por nome/data/última sessão | 2 | ⬜ |
| 1.2.5 | Tela de detalhe | Perfil completo do paciente | 5 | ⬜ |
| 1.2.6 | Criar paciente | Formulário completo | 5 | ⬜ |
| 1.2.7 | Editar paciente | Update de dados | 3 | ⬜ |
| 1.2.8 | Arquivar paciente | Soft delete | 2 | ⬜ |
| 1.2.9 | Foto do paciente | Upload para Storage | 3 | ⬜ |
| 1.2.10 | Informações médicas | Histórico médico | 3 | ⬜ |
| 1.2.11 | Contato de emergência | Dados de emergência | 2 | ⬜ |
| 1.2.12 | Paginação | Infinite scroll | 3 | ⬜ |
| 1.2.13 | Pull to refresh | Atualizar lista | 2 | ⬜ |
| 1.2.14 | Testes E2E | Playwright pacientes | 5 | ⬜ |

**Total Sprint:** 48 Story Points

---

### Sprint 1.3: Avaliações

**Objetivo:** Sistema de avaliações completo

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 1.3.1 | Templates de avaliação | CRUD de templates | 5 | ⬜ |
| 1.3.2 | Construtor de template | Drag & drop de campos | 8 | ⬜ |
| 1.3.3 | Tipos de campos | Text, number, select, etc | 3 | ⬜ |
| 1.3.4 | Template padrão | Template inicial pré-definido | 3 | ⬜ |
| 1.3.5 | Nova avaliação | Selecionar paciente + template | 3 | ⬜ |
| 1.3.6 | Formulário dinâmico | Renderizar campos do template | 5 | ⬜ |
| 1.3.7 | Validação de campos | Required, min/max | 3 | ⬜ |
| 1.3.8 | Anexar arquivos | Fotos/vídeos da avaliação | 5 | ⬜ |
| 1.3.9 | Salvar avaliação | Criar no Firestore | 3 | ⬜ |
| 1.3.10 | Histórico de avaliações | Lista por paciente | 3 | ⬜ |
| 1.3.11 | Detalhe da avaliação | Ver dados completos | 3 | ⬜ |
| 1.3.12 | Editar avaliação | Update de dados | 3 | ⬜ |
| 1.3.13 | Exportar PDF | Gerar PDF da avaliação | 5 | ⬜ |
| 1.3.14 | Comparar avaliações | Diff entre datas | 5 | ⬜ |
| 1.3.15 | Testes E2E | Playwright avaliações | 5 | ⬜ |

**Total Sprint:** 67 Story Points

---

### Sprint 1.4: Biblioteca de Exercícios

**Objetivo:** Gestão de exercícios

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 1.4.1 | Lista de exercícios | Cards com thumbnail | 3 | ⬜ |
| 1.4.2 | Filtros | Categoria, dificuldade, parte | 4 | ⬜ |
| 1.4.3 | Busca | Por nome/tags | 2 | ⬜ |
| 1.4.4 | Criar exercício | Formulário completo | 5 | ⬜ |
| 1.4.5 | Upload de vídeo | Compressão + upload | 5 | ⬜ |
| 1.4.6 | Upload de imagem | Thumbnail + instruções | 3 | ⬜ |
| 1.4.7 | Categorias | Selecionar múltiplas | 2 | ⬜ |
| 1.4.8 | Dificuldade | Beginner/Intermediate/Advanced | 1 | ⬜ |
| 1.4.9 | Equipamentos | Tags de equipamento | 2 | ⬜ |
| 1.4.10 | Instruções | Texto formatado | 2 | ⬜ |
| 1.4.11 | Editar exercício | Update completo | 3 | ⬜ |
| 1.4.12 | Duplicar exercício | Clone com novo ID | 2 | ⬜ |
| 1.4.13 | Compartilhar exercício | Tornar público | 2 | ⬜ |
| 1.4.14 | Exercícios públicos | Biblioteca comunitária | 5 | ⬜ |
| 1.4.15 | Testes E2E | Playwright exercícios | 4 | ⬜ |

**Total Sprint:** 49 Story Points

---

### Sprint 1.5: Planos de Tratamento

**Objetivo:** Prescrição de exercícios

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 1.5.1 | Criar plano | Selecionar paciente | 3 | ⬜ |
| 1.5.2 | Dados do plano | Nome, descrição, metas | 3 | ⬜ |
| 1.5.3 | Datas | Início, fim, frequência | 2 | ⬜ |
| 1.5.4 | Adicionar exercícios | Selecionar da biblioteca | 5 | ⬜ |
| 1.5.5 | Configurar exercício | Sets, reps, descanso | 5 | ⬜ |
| 1.5.6 | Ordem dos exercícios | Drag & drop reorder | 3 | ⬜ |
| 1.5.7 | Frequência semanal | Dias da semana | 2 | ⬜ |
| 1.5.8 | Preview do plano | Visualização completa | 3 | ⬜ |
| 1.5.9 | Salvar plano | Commit no Firestore | 3 | ⬜ |
| 1.5.10 | Listar planos | Por paciente | 2 | ⬜ |
| 1.5.11 | Ativar/desativar | Toggle de status | 2 | ⬜ |
| 1.5.12 | Editar plano | Update de dados | 3 | ⬜ |
| 1.5.13 | Gerar sessões | Criar sessões futuras | 5 | ⬜ |
| 1.5.14 | Clonar plano | Copy com novo ID | 3 | ⬜ |
| 1.5.15 | Testes E2E | Playwright planos | 5 | ⬜ |

**Total Sprint:** 53 Story Points

---

### Sprint 1.6: Agenda Básica

**Objetivo:** Gestão de compromissos

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 1.6.1 | View de dia | Colunas de horas | 5 | ⬜ |
| 1.6.2 | View de semana | 7 dias | 5 | ⬜ |
| 1.6.3 | View de mês | Calendário mensal | 5 | ⬜ |
| 1.6.4 | Criar compromisso | Formulário rápido | 3 | ⬜ |
| 1.6.5 | Selecionar paciente | Search + select | 2 | ⬜ |
| 1.6.6 | Data/hora | DatePicker + TimePicker | 3 | ⬜ |
| 1.6.7 | Tipo de consulta | Avaliação, followup | 1 | ⬜ |
| 1.6.8 | Valor | Preço da sessão | 2 | ⬜ |
| 1.6.9 | Arrastar evento | Drag to reschedule | 5 | ⬜ |
| 1.6.10 | Editar compromisso | Update | 3 | ⬜ |
| 1.6.11 | Cancelar compromisso | Status change | 2 | ⬜ |
| 1.6.12 | Lista de hoje | Quick view | 2 | ⬜ |
| 1.6.13 | Lembretes | Notificações | 3 | ⬜ |
| 1.6.14 | Sync com calendário | Calendário nativo iOS | 5 | ⬜ |
| 1.6.15 | Testes E2E | Playwright agenda | 5 | ⬜ |

**Total Sprint:** 56 Story Points

---

### Sprint 1.7: Financeiro Básico

**Objetivo:** Controle de pagamentos

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 1.7.1 | Dashboard financeiro | Resumo mensal | 5 | ⬜ |
| 1.7.2 | Receita do mês | Cards com valores | 3 | ⬜ |
| 1.7.3 | Pagamentos pendentes | Lista de recebíveis | 3 | ⬜ |
| 1.7.4 | Registrar pagamento | Formulário | 3 | ⬜ |
| 1.7.5 | Forma de pagamento | Dinheiro, PIX, cartão | 2 | ⬜ |
| 1.7.6 | Vincular consulta | Auto-preenchimento | 2 | ⬜ |
| 1.7.7 | Histórico | Lista completa | 3 | ⬜ |
| 1.7.8 | Filtros | Por período/paciente | 3 | ⬜ |
| 1.7.9 | Gráfico de receita | Chart por mês | 5 | ⬜ |
| 1.7.10 | Exportar dados | CSV/Excel | 3 | ⬜ |
| 1.7.11 | Status de pagamento | Pendente/pago | 2 | ⬜ |
| 1.7.12 | Notificação | Aviso de pagamento | 3 | ⬜ |
| 1.7.13 | Testes E2E | Playwright financeiro | 4 | ⬜ |

**Total Sprint:** 45 Story Points

---

### Sprint 1.8: Dashboard Profissional

**Objetivo:** Visão geral completa

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 1.8.1 | Cards de resumo | Pacientes, sessões, receita | 3 | ⬜ |
| 1.8.2 | Agenda de hoje | Próximas consultas | 3 | ⬜ |
| 1.8.3 | Pacientes ativos | Número + lista rápida | 3 | ⬜ |
| 1.8.4 | Sessões da semana | Gráfico | 5 | ⬜ |
| 1.8.5 | Receita do mês | Valor + comparativo | 3 | ⬜ |
| 1.8.6 | Pagamentos pendentes | Cards + ação | 3 | ⬜ |
| 1.8.7 | Aniversários do mês | Lista | 2 | ⬜ |
| 1.8.8 | Atalhos rápidos | Ações comuns | 3 | ⬜ |
| 1.8.9 | Notificações | Badge + lista | 3 | ⬜ |
| 1.8.10 | Pull to refresh | Atualizar dados | 2 | ⬜ |
| 1.8.11 | Empty states | Quando não há dados | 2 | ⬜ |
| 1.8.12 | Testes E2E | Playwright dashboard | 4 | ⬜ |

**Total Sprint:** 40 Story Points

---

## Fase 2: MVP Pacientes (Semanas 9-14)

### Sprint 2.1: Autenticação e Onboarding Pacientes

**Objetivo:** Login simplificado para pacientes

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 2.1.1 | Splash com logo | Animação suave | 2 | ⬜ |
| 2.1.2 | Login simplificado | Email + senha | 3 | ⬜ |
| 2.1.3 | Registro com código | Vincular ao profissional | 5 | ⬜ |
| 2.1.4 | Validação de código | Verificar profissional | 5 | ⬜ |
| 2.1.5 | Onboarding interativo | 4-5 telas | 5 | ⬜ |
| 2.1.6 | Perfil inicial | Nome, foto, dados básicos | 3 | ⬜ |
| 2.1.7 | Termos de uso | Aceitação obrigatória | 2 | ⬜ |
| 2.1.8 | Permissões | Câmera, notificações | 3 | ⬜ |
| 2.1.9 | Testes E2E | Playwright auth paciente | 4 | ⬜ |

**Total Sprint:** 32 Story Points

---

### Sprint 2.2: Dashboard do Paciente

**Objetivo:** Visão pessoal e motivacional

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 2.2.1 | Boas-vindas | Personalizado com nome | 2 | ⬜ |
| 2.2.2 | Exercícios de hoje | Cards destacados | 3 | ⬜ |
| 2.2.3 | Progresso semanal | Badge + porcentagem | 3 | ⬜ |
| 2.2.4 | Streak | Dias consecutivos | 3 | ⬜ |
| 2.2.5 | Próxima consulta | Card com data/hora | 2 | ⬜ |
| 2.2.6 | Conquistas | Badges desbloqueadas | 3 | ⬜ |
| 2.2.7 | Mensagem do profissional | Nota/texto | 2 | ⬜ |
| 2.2.8 | Ação rápida | Botão "Começar exercícios" | 1 | ⬜ |
| 2.2.9 | Empty states | Primeiro acesso | 2 | ⬜ |
| 2.2.10 | Testes E2E | Playwright dashboard | 3 | ⬜ |

**Total Sprint:** 24 Story Points

---

### Sprint 2.3: Lista e Detalhe de Exercícios

**Objetivo:** Visualizar prescrições

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 2.3.1 | Lista de exercícios | Cards com thumb + nome | 3 | ⬜ |
| 2.3.2 | Filtro por data | Seletor de dia | 2 | ⬜ |
| 2.3.3 | Status visual | Pendente/completo | 2 | ⬜ |
| 2.3.4 | Detalhe do exercício | Tela com info completa | 5 | ⬜ |
| 2.3.5 | Vídeo demonstrativo | Player inline | 3 | ⬜ |
| 2.3.6 | Imagens de referência | Galeria | 2 | ⬜ |
| 2.3.7 | Instruções | Texto formatado | 2 | ⬜ |
| 2.3.8 | Parâmetros | Sets, reps, carga | 2 | ⬜ |
| 2.3.9 | Histórico | Sessões anteriores | 3 | ⬜ |
| 2.3.10 | Marcar como feito | Checkbox + feedback | 2 | ⬜ |
| 2.3.11 | Testes E2E | Playwright exercícios | 4 | ⬜ |

**Total Sprint:** 30 Story Points

---

### Sprint 2.4: Execução de Exercícios

**Objetivo:** Interface de treino

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 2.4.1 | Tela de execução | Fullscreen | 3 | ⬜ |
| 2.4.2 | Timer integrado | Cronômetro + descanso | 5 | ⬜ |
| 2.4.3 | Contador de sets | Checkboxes | 3 | ⬜ |
| 2.4.4 | Feedback de dor | Slider 0-10 | 3 | ⬜ |
| 2.4.5 | Dificuldade | Easy/OK/Hard | 2 | ⬜ |
| 2.4.6 | Notas | Texto opcional | 2 | ⬜ |
| 2.4.7 | Gravar vídeo | Opcional | 5 | ⬜ |
| 2.4.8 | Preview do vídeo | Reproduzir | 3 | ⬜ |
| 2.4.9 | Enviar vídeo | Upload assíncrono | 5 | ⬜ |
| 2.4.10 | Confirmação | Sucesso + celebração | 2 | ⬜ |
| 2.4.11 | Progresso do dia | Barra de conclusão | 3 | ⬜ |
| 2.4.12 | Testes E2E | Playwright execução | 5 | ⬜ |

**Total Sprint:** 46 Story Points

---

### Sprint 2.5: Progresso e Estatísticas

**Objetivo:** Visualizar evolução

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 2.5.1 | Gráfico semanal | Sessões completadas | 5 | ⬜ |
| 2.5.2 | Gráfico mensal | Evolução | 5 | ⬜ |
| 2.5.3 | Evolução da dor | Line chart | 5 | ⬜ |
| 2.5.4 | Adesão | Porcentagem | 3 | ⬜ |
| 2.5.5 | Total de sessões | Counter | 2 | ⬜ |
| 2.5.6 | Tempo total | Formatted | 2 | ⬜ |
| 2.5.7 | Comparação | Este mês vs anterior | 3 | ⬜ |
| 2.5.8 | Conquistas | Grid de badges | 3 | ⬜ |
| 2.5.9 | Detalhe da conquista | Modal | 2 | ⬜ |
| 2.5.10 | Compartilhar | Social share | 3 | ⬜ |
| 2.5.11 | Testes E2E | Playwright progresso | 4 | ⬜ |

**Total Sprint:** 42 Story Points

---

### Sprint 2.6: Notificações e Engajamento

**Objetivo:** Manter paciente ativo

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 2.6.1 | Solicitar permissão | In-app prompt | 2 | ⬜ |
| 2.6.2 | Lembrete de exercícios | Agenda diária | 5 | ⬜ |
| 2.6.3 | Lembrete de consulta | 24h antes | 3 | ⬜ |
| 2.6.4 | Confirmação de consulta | Botões confirmar/cancelar | 3 | ⬜ |
| 2.6.5 | Celebração de conquista | Badge notification | 2 | ⬜ |
| 2.6.6 | Reengajamento | 3 dias sem atividade | 3 | ⬜ |
| 2.6.7 | Centro de notificações | Lista de notificações | 3 | ⬜ |
| 2.6.8 | Actionable notifications | Tappable notifications | 5 | ⬜ |
| 2.6.9 | Preferências | Configurar horários | 3 | ⬜ |
| 2.6.10 | Testes E2E | Playwright notificações | 4 | ⬜ |

**Total Sprint:** 36 Story Points

---

## Fase 3: Refinamento e Teste (Semanas 15-18)

### Sprint 3.1: Polimento e Performance

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 3.1.1 | Otimizar imagens | Compressão AVIF/WebP | 3 | ⬜ |
| 3.1.2 | Lazy loading | Carregar sob demanda | 3 | ⬜ |
| 3.1.3 | Cache estratégias | TanStack Query cache | 5 | ⬜ |
| 3.1.4 | Reduzir bundle size | Code splitting | 5 | ⬜ |
| 3.1.5 | Otimizar queries | Índices Firestore | 5 | ⬜ |
| 3.1.6 | Memory leaks | Cleanup effects | 3 | ⬜ |
| 3.1.7 | Animações suaves | 60fps | 5 | ⬜ |
| 3.1.8 | Loading skeletons | Estados de carregamento | 3 | ⬜ |
| 3.1.9 | Error boundaries | Graceful failures | 3 | ⬜ |
| 3.1.10 | Testes de performance | Lighthouse/Metrics | 5 | ⬜ |

**Total Sprint:** 45 Story Points

---

### Sprint 3.2: Testes com Usuários

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 3.2.1 | Recrutar beta testers | 10 profissionais | 3 | ⬜ |
| 3.2.2 | Recrutar pacientes | 50 pacientes | 3 | ⬜ |
| 3.2.3 | Onboarding remoto | Tutorial + suporte | 3 | ⬜ |
| 3.2.4 | Coletar feedback | Formulário estruturado | 5 | ⬜ |
| 3.2.5 | Analisar feedback | Categorizar issues | 5 | ⬜ |
| 3.2.6 | Priorizar fixes | MoSCoW | 3 | ⬜ |
| 3.2.7 | Corrigir bugs críticos | Hotfixes | 8 | ⬜ |
| 3.2.8 | Ajustes de UX | Melhorias | 5 | ⬜ |
| 3.2.9 | Nova build TestFlight | Atualização | 2 | ⬜ |
| 3.2.10 | Segunda rodada de testes | Validação | 3 | ⬜ |

**Total Sprint:** 40 Story Points

---

### Sprint 3.3: Preparação Launch

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 3.3.1 | Screenshots App Store | Todos tamanhos iOS | 5 | ⬜ |
| 3.3.2 | Descrição do app | Texto persuasivo | 3 | ⬜ |
| 3.3.3 | Palavras-chave | ASO | 2 | ⬜ |
| 3.3.4 | Vídeo preview | 30 segundos | 5 | ⬜ |
| 3.3.5 | Política de privacidade | Documento legal | 5 | ⬜ |
| 3.3.6 | Termos de uso | Documento legal | 5 | ⬜ |
| 3.3.7 | Ícone do app | 1024x1024 | 3 | ⬜ |
| 3.3.8 | Landing page | Website | 8 | ⬜ |
| 3.3.9 | Press kit | Media kit | 3 | ⬜ |
| 3.3.10 | App Store submission | Checklist completo | 5 | ⬜ |

**Total Sprint:** 44 Story Points

---

### Sprint 3.4: Lançamento

| ID | Tarefa | Descrição | Story Points | Status |
|----|--------|-----------|--------------|--------|
| 3.4.1 | Submit App Store | Submissão oficial | 3 | ⬜ |
| 3.4.2 | Aguardar aprovação | Review process | - | ⬜ |
| 3.4.3 | Setup analytics | Firebase Analytics | 3 | ⬜ |
| 3.4.4 | Setup Crashlytics | Crash reporting | 3 | ⬜ |
| 3.4.5 | Setup Performance | Monitoramento | 3 | ⬜ |
| 3.4.6 | Soft launch | Disponibilização | 2 | ⬜ |
| 3.4.7 | Monitorar crashes | Dashboard | 2 | ⬜ |
| 3.4.8 | Suporte inicial | Responder reviews | 3 | ⬜ |
| 3.4.9 | Marketing inicial | Divulgação | 5 | ⬜ |
| 3.4.10 | Iteração rápida | Hotfixes | 5 | ⬜ |

**Total Sprint:** 29 Story Points

---

## Resumo Geral

### Story Points por Fase

| Fase | Sprint | Story Points |
|------|--------|--------------|
| **Fase 0** | 0.1 | ~40 |
| | 0.2 | ~35 |
| **Subtotal** | | **~75** |
| **Fase 1** | 1.1 | 32 |
| | 1.2 | 48 |
| | 1.3 | 67 |
| | 1.4 | 49 |
| | 1.5 | 53 |
| | 1.6 | 56 |
| | 1.7 | 45 |
| | 1.8 | 40 |
| **Subtotal** | | **~390** |
| **Fase 2** | 2.1 | 32 |
| | 2.2 | 24 |
| | 2.3 | 30 |
| | 2.4 | 46 |
| | 2.5 | 42 |
| | 2.6 | 36 |
| **Subtotal** | | **~210** |
| **Fase 3** | 3.1 | 45 |
| | 3.2 | 40 |
| | 3.3 | 44 |
| | 3.4 | 29 |
| **Subtotal** | | **~158** |
| **TOTAL** | | **~833 Story Points** |

### Timeline

| Fase | Semanas | Duração |
|------|---------|---------|
| Fundação | 1-2 | 2 semanas |
| MVP Profissionais | 3-8 | 6 semanas |
| MVP Pacientes | 9-14 | 6 semanas |
| Refinamento e Launch | 15-18 | 4 semanas |
| **TOTAL** | **1-18** | **18 semanas (~4.5 meses)** |

---

**Documento criado em:** 24 de Janeiro de 2026
**Versão:** 1.0
**Status:** Pronto para Implementação
