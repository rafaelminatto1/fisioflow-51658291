# TODO LIST - DESENVOLVIMENTO FISIOFLOW

**Status:** Atualizado em 2026-02-02
**Instrucoes:** Marque [x] quando completar cada item

---

## FASE 1: CORRECOES CRITICAS ✅ COMPLETA

### 1.1 Bugs React Error #185 - TODOS CORRIGIDOS

- [x] **#001** Loop infinito em `AppointmentModalRefactored.tsx` ✅
  ```
  Status: CORRIGIDO - Usa useRef para dependencias estaveis
  ```

- [x] **#002** onClick duplicado em `AppointmentQuickView.tsx` ✅
  ```
  Status: CORRIGIDO - DrawerTrigger sem onClick duplicado
  ```

### 1.2 Migracao Supabase -> Firebase - COMPLETA

- [x] **#005** `NewPatientModal.tsx` migrado para Firebase ✅
  ```
  Status: CORRIGIDO - Usa addDoc, collection, serverTimestamp do Firebase
  ```

- [ ] Verificar outros arquivos com importacoes de Supabase (opcional)
  ```bash
  grep -r "supabase" src/ --include="*.ts" --include="*.tsx"
  ```

### 1.3 Bugs Medios - TODOS CORRIGIDOS

- [x] **#003** `CalendarAppointmentCard.tsx` ✅
  ```
  Status: CORRIGIDO - onOpenPopover tratado pelo wrapper AppointmentQuickView
  ```

- [x] **#004** `ProtocolCardEnhanced.tsx` ✅
  ```
  Status: CORRIGIDO - onClick com stopPropagation nos DropdownMenuItems
  ```

- [x] **#008** `SOAPFormPanel.tsx` ✅
  ```
  Status: CORRIGIDO - SOAPField usa debounce com useRef e setTimeout
  ```

### 1.4 Validacao Pos-Correcao (EM ANDAMENTO)

**Os bugs criticos foram corrigidos. Agora e necessario validar os fluxos:**

- [x] Verificar console do navegador (sem erros React)
- [x] Confirmar correcoes via code review
- [ ] Testar fluxo: Criar novo paciente (requer execucao manual)
- [ ] Testar fluxo: Editar paciente existente (requer execucao manual)
- [ ] Testar fluxo: Criar novo agendamento (requer execucao manual)
- [ ] Testar fluxo: Editar agendamento existente (requer execucao manual)
- [ ] Testar fluxo: Cancelar agendamento (requer execucao manual)
- [ ] Testar fluxo: Criar evolucao SOAP (requer execucao manual)
- [ ] Testar fluxo: Editar evolucao SOAP (requer execucao manual)
- [ ] Testar em diferentes resolucoes (desktop/tablet/mobile)

---

## FASE 2: TESTES E QUALIDADE

### 2.1 Configuracao de Testes

- [ ] Atualizar mocks de Supabase para Firebase
  ```
  Arquivos: src/test/**/*.ts
  ```

- [ ] Configurar cobertura de testes
  ```bash
  pnpm test:coverage
  ```

- [ ] Configurar CI/CD com testes automaticos

### 2.2 Testes E2E (Playwright)

- [ ] Teste E2E: Login/Logout
- [ ] Teste E2E: Cadastro completo de paciente
- [ ] Teste E2E: Fluxo de agendamento
- [ ] Teste E2E: Prescricao de exercicios
- [ ] Teste E2E: Registro SOAP
- [ ] Teste E2E: Relatorio financeiro

### 2.3 Testes Unitarios Prioritarios

- [ ] Testes para hooks de agendamento
- [ ] Testes para hooks de pacientes
- [ ] Testes para servicos de Firebase
- [ ] Testes para validacoes Zod
- [ ] Testes para utilitarios de data

### 2.4 Testes de Acessibilidade

- [ ] Executar `axe-core` em todas as paginas
- [ ] Corrigir problemas de contraste
- [ ] Verificar navegacao por teclado
- [ ] Testar com screen reader (VoiceOver/NVDA)

---

## FASE 3: NOTIFICACOES

### 3.1 Backend

- [ ] Revisar Cloud Functions de notificacao
  ```
  Arquivo: functions/src/communications/
  ```

- [ ] Configurar templates de email (Resend)
- [ ] Configurar templates WhatsApp (Cloud API)
- [ ] Implementar preferencias de notificacao por usuario

### 3.2 Frontend

- [ ] Criar pagina de preferencias de notificacao
- [ ] Criar centro de notificacoes (inbox)
- [ ] Implementar badge de notificacoes nao lidas
- [ ] Criar componente de notificacao toast

### 3.3 Push Notifications

- [ ] Configurar Firebase Cloud Messaging
- [ ] Implementar service worker para push
- [ ] Criar UI de permissao de notificacao
- [ ] Testar notificacoes em producao

---

## FASE 4: APP MOBILE PACIENTES

### 4.1 Setup e Configuracao

- [ ] Verificar configuracao Expo existente
  ```
  Pasta: patient-app/
  ```

- [ ] Configurar EAS Build
- [ ] Configurar Firebase para mobile

### 4.2 Telas Principais

- [ ] Tela: Login
- [ ] Tela: Registro
- [ ] Tela: Forgot Password
- [ ] Tela: Link Professional
- [ ] Tela: Onboarding
- [ ] Tela: Home/Dashboard
- [ ] Tela: Lista de Exercicios
- [ ] Tela: Detalhes do Exercicio
- [ ] Tela: Video do Exercicio
- [ ] Tela: Progresso/Estatisticas
- [ ] Tela: Agendamentos
- [ ] Tela: Perfil
- [ ] Tela: Configuracoes

### 4.3 Funcionalidades

- [ ] Autenticacao Firebase
- [ ] Sincronizacao offline
- [ ] Push notifications nativas
- [ ] Deep linking
- [ ] Biometria (FaceID/TouchID)
- [ ] Feedback de exercicios

### 4.4 Build e Deploy

- [ ] Build iOS (TestFlight)
- [ ] Build Android (Play Console interno)
- [ ] Testes em dispositivos reais
- [ ] Preparar assets para lojas

---

## FASE 5: GAMIFICACAO

### 5.1 Backend

- [ ] Revisar sistema de pontos
  ```
  Arquivo: functions/src/api/patient-stats.ts
  ```

- [ ] Implementar leaderboard
- [ ] Criar sistema de conquistas
- [ ] Criar sistema de desafios

### 5.2 Frontend (Paciente)

- [ ] Dashboard de gamificacao
- [ ] Visualizacao de pontos/nivel
- [ ] Lista de conquistas
- [ ] Leaderboard semanal
- [ ] Notificacoes de conquistas

### 5.3 Frontend (Profissional)

- [ ] Criar desafios para pacientes
- [ ] Visualizar progresso de pacientes
- [ ] Relatorio de engajamento
- [ ] Configurar recompensas

---

## FASE 6: CRM E MARKETING

### 6.1 Leads

- [ ] Formulario de captura de leads
- [ ] Listagem e filtro de leads
- [ ] Conversao lead -> paciente
- [ ] Historico de interacoes

### 6.2 Campanhas

- [ ] Criar campanhas de email
- [ ] Templates de email editaveis
- [ ] Agendamento de envios
- [ ] Analytics de campanhas

### 6.3 WhatsApp Business

- [ ] Integracao completa com API
- [ ] Templates aprovados
- [ ] Automacao de mensagens
- [ ] Chatbot basico

### 6.4 Automacao

- [ ] Sequencias de email automaticas
- [ ] Lembretes de retorno
- [ ] Aniversarios
- [ ] Reativacao de pacientes inativos

---

## FASE 7: TELEMEDICINA

### 7.1 Video Chamada

- [ ] Setup WebRTC/Twilio/Daily.co
- [ ] Sala de espera virtual
- [ ] Controles de audio/video
- [ ] Compartilhamento de tela

### 7.2 Durante Consulta

- [ ] Chat em tempo real
- [ ] Anotacoes sincronizadas
- [ ] Compartilhamento de imagens
- [ ] Timer de sessao

### 7.3 Pos-Consulta

- [ ] Gravacao opcional
- [ ] Resumo automatico
- [ ] Integracao com SOAP
- [ ] Envio de resumo ao paciente

---

## FASE 8: IA AVANCADA

### 8.1 Analise de Movimento

- [ ] Integrar MediaPipe Pose
- [ ] Criar UI de captura de video
- [ ] Comparar com movimento correto
- [ ] Feedback em tempo real
- [ ] Relatorio de analise

### 8.2 Sugestoes IA

- [ ] Sugestao de exercicios baseada em diagnostico
- [ ] Predicao de adesao
- [ ] Chat clinico com contexto do paciente
- [ ] Geracao automatica de notas SOAP

---

## OTIMIZACOES E MELHORIAS CONTINUAS

### Performance

- [ ] Lazy loading de componentes pesados
- [ ] Otimizar bundle size
- [ ] Implementar skeleton screens faltantes
- [ ] Cache de imagens
- [ ] Prefetch de dados criticos

### Seguranca

- [ ] Revisar Firestore Security Rules
- [ ] Implementar rate limiting
- [ ] Auditoria de logs
- [ ] Backup automatico

### Acessibilidade

- [ ] WCAG 2.1 AA em todas as paginas
- [ ] Modo alto contraste
- [ ] Reducao de movimento
- [ ] Suporte a zoom

### Internacionalizacao (Futuro)

- [ ] Implementar i18next
- [ ] Extrair strings
- [ ] Traduzir para EN
- [ ] Traduzir para ES

---

## COMANDOS RAPIDOS

```bash
# Desenvolvimento
pnpm dev                    # Inicia frontend
pnpm test                   # Roda testes
pnpm lint                   # Verifica lint
pnpm build                  # Build producao

# Mobile
pnpm dev:patient            # App paciente
pnpm dev:professional       # App profissional

# Deploy
pnpm deploy:web             # Deploy hosting
pnpm deploy:functions       # Deploy functions
pnpm deploy:all             # Deploy completo

# Verificacao
pnpm test:pre-deploy        # Todos os testes
pnpm test:e2e               # Testes E2E
pnpm test:coverage          # Cobertura
```

---

## DICAS PARA CLAUDE CODE LOCAL

1. **Sempre ler o arquivo antes de editar**
   ```
   Use Read tool antes de Edit tool
   ```

2. **Testar apos cada mudanca**
   ```bash
   pnpm test
   pnpm lint
   ```

3. **Commits frequentes**
   ```bash
   git add [arquivo]
   git commit -m "feat/fix/refactor: descricao clara"
   ```

4. **Verificar console**
   - Abrir DevTools (F12)
   - Tab Console
   - Filtrar por erros

5. **Testar responsividade**
   - DevTools -> Toggle device toolbar
   - Testar em 375px, 768px, 1024px, 1440px

---

**Nota:** Este documento deve ser atualizado conforme o progresso. Marque [x] nos itens completados e adicione novas tarefas conforme necessario.
