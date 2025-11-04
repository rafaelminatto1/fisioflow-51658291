# Workflow de Atendimentos - FisioFlow

## 📋 Visão Geral

O workflow de atendimentos foi completamente redesenhado para proporcionar uma experiência mais eficiente e guiada para os fisioterapeutas durante a evolução dos pacientes.

## ✨ Principais Melhorias Implementadas

### 1. **Wizard de Progresso**
- **Guia visual** com 5 etapas: Subjetivo, Objetivo, Avaliação, Plano e Medições
- **Indicadores visuais** de progresso mostrando quais seções foram completadas
- **Navegação intuitiva** permitindo saltar entre seções

### 2. **Timer de Sessão**
- **Contador em tempo real** mostrando duração do atendimento
- **Controles de pausa/play** para precisão no tempo
- **Formato adaptativo** (horas:minutos quando > 1h, minutos:segundos para sessões curtas)

### 3. **Auto-Save Inteligente**
- **Salvamento automático** a cada 5 segundos de inatividade
- **Notificações discretas** confirmando que os dados foram salvos
- **Botão de toggle** para ativar/desativar conforme necessário
- **Evita perda de dados** em caso de fechamento acidental

### 4. **Botão "Concluir Atendimento"**
- **Fluxo completo** que salva a evolução e marca o appointment como concluído
- **Validação** garantindo que campos SOAP estão preenchidos
- **Redirecionamento automático** para agenda após conclusão
- **Feedback visual** durante o processo

### 5. **Interface Aprimorada**
- **Header moderno** com gradientes e informações do paciente
- **Timer sempre visível** no header
- **Botões de ação destacados** (Salvar e Concluir)
- **Layout responsivo** adaptado para diferentes tamanhos de tela

## 🔄 Fluxo de Uso

### Iniciando um Atendimento

1. **Na agenda**, localize o agendamento do paciente
2. Clique no **menu de ações** (três pontos)
3. Selecione **"Iniciar Atendimento"**
4. Você será redirecionado para a página de evolução

### Durante o Atendimento

1. **Siga o wizard** de progresso visual:
   - ✅ **Subjetivo**: Relato do paciente (queixas, sintomas)
   - ✅ **Objetivo**: Observações clínicas (exame físico)
   - ✅ **Avaliação**: Análise e diagnóstico
   - ✅ **Plano**: Condutas e próximos passos
   - ✅ **Medições** (opcional): Testes e medições quantitativas

2. **Auto-save ativo**: Suas alterações são salvas automaticamente

3. **Timer registrando**: O tempo da sessão é contabilizado automaticamente

4. **Navegação livre**: Clique em qualquer etapa do wizard para navegar

### Finalizando o Atendimento

1. **Revise** os campos SOAP preenchidos
2. Clique em **"Concluir Atendimento"**
3. O sistema irá:
   - Salvar a evolução final
   - Marcar o appointment como concluído
   - Redirecionar para a agenda

## 🎯 Componentes Criados

### `SessionWizard`
**Localização**: `src/components/evolution/SessionWizard.tsx`

Componente de navegação visual que mostra o progresso do atendimento através de 5 etapas.

**Props**:
- `steps`: Array de objetos com id, label, completed e optional
- `currentStep`: ID da etapa atual
- `onStepClick`: Callback ao clicar em uma etapa

### `SessionTimer`
**Localização**: `src/components/evolution/SessionTimer.tsx`

Timer que conta o tempo decorrido desde o início da sessão.

**Props**:
- `startTime`: Data/hora de início da sessão
- `className`: Classes CSS opcionais

**Funcionalidades**:
- Contador em tempo real
- Botão pause/play
- Formato adaptativo de exibição

### `useAutoSave`
**Localização**: `src/hooks/useAutoSave.ts`

Hook customizado para implementar salvamento automático de dados.

**Parâmetros**:
- `data`: Dados a serem salvos
- `onSave`: Função assíncrona de salvamento
- `delay`: Delay em ms (padrão: 3000ms)
- `enabled`: Se o auto-save está ativo

**Retorno**:
- `save`: Função para forçar salvamento manual

## 🎨 Design System

Todos os componentes seguem o design system do projeto:
- **Cores**: Uso de tokens semânticos (primary, muted, etc.)
- **Espaçamento**: Grid system consistente
- **Animações**: Transições suaves em estados hover
- **Responsividade**: Layout adaptativo mobile-first

## 📊 Estados do Wizard

Cada etapa do wizard pode ter 3 estados visuais:

1. **Não iniciada**: Círculo vazio, cor muted
2. **Atual**: Círculo com borda primary, cor primary
3. **Completa**: CheckCircle, background primary

### Critérios de Completude

- **Subjetivo**: Mínimo 10 caracteres
- **Objetivo**: Mínimo 10 caracteres
- **Avaliação**: Mínimo 10 caracteres
- **Plano**: Mínimo 10 caracteres
- **Medições**: Pelo menos 1 medição registrada (opcional)

## 🔐 Validações

### Ao Salvar
- Pelo menos 1 campo SOAP deve estar preenchido

### Ao Concluir Atendimento
- Todos os campos SOAP obrigatórios devem estar preenchidos
- Salvamento bem-sucedido antes de concluir
- Appointment deve existir e estar acessível

## 💡 Dicas de Uso

1. **Use o auto-save**: Deixe ativo para não perder dados
2. **Siga o wizard**: A ordem sugerida otimiza o fluxo
3. **Pause o timer**: Se precisar de uma pausa, use o botão pause
4. **Revise antes de concluir**: Garanta que tudo está documentado

## 🚀 Próximas Melhorias Planejadas

- [ ] Atalhos de teclado para navegação rápida
- [ ] Templates de texto pré-definidos (snippets)
- [ ] Reconhecimento de voz para ditado
- [ ] Sugestões de IA baseadas no histórico
- [ ] Gráficos de evolução em tempo real
- [ ] Impressão direta do atendimento

## 📝 Notas Técnicas

### Performance
- Auto-save usa debounce de 3-5s para evitar requests excessivos
- Timer usa requestAnimationFrame para performance otimizada
- Wizard usa useMemo para evitar re-renders desnecessários

### Acessibilidade
- Todos os componentes têm aria-labels apropriados
- Navegação via teclado totalmente suportada
- Foco visível em todos os elementos interativos
- Contraste de cores conforme WCAG 2.1 AA

### Compatibilidade
- Testado em Chrome, Firefox, Safari, Edge
- Responsivo para mobile, tablet e desktop
- Funciona offline (com limitações de salvamento)
