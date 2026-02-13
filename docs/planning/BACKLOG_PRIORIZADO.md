# Backlog Priorizado - FisioFlow

## 🔴 CRÍTICO - Implementar Imediatamente

### Segurança
1. **Auditoria RLS Policies**
   - Revisar todas as policies de eventos, prestadores, participantes
   - Verificar se dados sensíveis (CPF, emails) estão protegidos
   - Testar tentativas de acesso não autorizado
   - **Estimativa**: 4h
   - **Responsável**: Backend Dev

2. **Rate Limiting**
   - Implementar rate limit em edge functions públicas
   - Adicionar rate limit em endpoints de autenticação
   - Configurar alertas de tentativas excessivas
   - **Estimativa**: 3h
   - **Responsável**: Backend Dev

3. **Validação de Inputs**
   - Revisar todos os schemas Zod
   - Adicionar validação server-side em edge functions
   - Implementar sanitização de HTML
   - **Estimativa**: 6h
   - **Responsável**: Full Stack Dev

4. **Criptografia de Dados Sensíveis**
   - Implementar criptografia para CPF
   - Criptografia para dados médicos sensíveis
   - Usar pgcrypto do Postgres
   - **Estimativa**: 8h
   - **Responsável**: Backend Dev

### Performance
5. **Otimização de Queries**
   - Adicionar índices em `eventos.status`, `participantes.evento_id`
   - Otimizar query de dashboard (muito joins)
   - Implementar paginação em listagem de eventos
   - **Estimativa**: 4h
   - **Responsável**: Backend Dev

6. **Lazy Loading de Rotas**
   - Já implementado, mas revisar bundle size
   - Code splitting adicional se necessário
   - **Estimativa**: 2h
   - **Responsável**: Frontend Dev

### Bugs Conhecidos
7. **Corrigir Upload de Arquivos**
   - FileUploadTest está mock, integrar com Supabase Storage
   - Criar bucket para documentos
   - RLS policies para storage
   - **Estimativa**: 4h
   - **Responsável**: Full Stack Dev

---

## 🟠 ALTA PRIORIDADE - Próxima Sprint

### Funcionalidades Core
8. **Integração Stripe para Vouchers**
   - Setup Stripe account
   - Edge function para criar checkout session
   - Webhook para confirmar pagamento
   - Tabela `vouchers_purchases` no DB
   - **Estimativa**: 16h
   - **Responsável**: Full Stack Dev
   - **Bloqueadores**: Nenhum
   - **Dependências**: Stripe API key

9. **Sistema de Vouchers no DB**
   ```sql
   -- Criar tabelas:
   -- vouchers (já tem mock, migrar para DB)
   -- user_vouchers (compras dos usuários)
   -- voucher_sessions (controle de uso)
   ```
   - **Estimativa**: 6h
   - **Responsável**: Backend Dev

10. **Integrar Vouchers com Agendamento**
    - Dropdown para selecionar voucher ao agendar
    - Decrementar sessões do voucher
    - Validar expiração
    - **Estimativa**: 8h
    - **Responsável**: Full Stack Dev
    - **Dependências**: #9

### IA
11. **Habilitar Lovable AI**
    - Chamar tool `ai_gateway--enable_ai_gateway`
    - Criar edge function `/functions/ai-chat`
    - Implementar streaming no frontend
    - **Estimativa**: 6h
    - **Responsável**: Full Stack Dev

12. **Smart AI - Contexto do Paciente**
    - Passar histórico do paciente para IA
    - Sugestões baseadas em diagnóstico
    - Cache de conversas
    - **Estimativa**: 10h
    - **Responsável**: Full Stack Dev
    - **Dependências**: #11

### Comunicação
13. **WhatsApp Business API Setup**
    - Criar conta Meta Business
    - Configurar WhatsApp Business API
    - Criar templates de mensagem
    - Edge function para enviar mensagens
    - **Estimativa**: 12h
    - **Responsável**: Backend Dev
    - **Bloqueadores**: Aprovação de templates (pode levar dias)

14. **SendGrid/Resend Setup**
    - Setup account
    - Templates de email (confirmação, lembrete)
    - Edge function para enviar emails
    - **Estimativa**: 6h
    - **Responsável**: Backend Dev

---

## 🟡 MÉDIA PRIORIDADE - Sprint +1

### UX/UI
15. **Onboarding Flow**
    - Modal de boas-vindas
    - Tour guiado por perfil
    - Tooltips contextuais
    - **Estimativa**: 12h
    - **Responsável**: Frontend Dev

16. **PWA Avançado**
    - Service worker robusto
    - Offline mode básico
    - Push notifications setup
    - Add to home screen prompt
    - **Estimativa**: 16h
    - **Responsável**: Frontend Dev

17. **Skeleton Loaders**
    - Substituir spinners por skeletons
    - Melhor UX de loading
    - **Estimativa**: 6h
    - **Responsável**: Frontend Dev

18. **Accessibility Improvements**
    - Screen reader testing
    - Keyboard navigation
    - ARIA labels
    - Contrast checker
    - **Estimativa**: 10h
    - **Responsável**: Frontend Dev

### Features
19. **Prontuário - Anexos**
    - Upload de imagens/PDFs
    - Galeria de evolução
    - Antes/Depois
    - **Estimativa**: 10h
    - **Responsável**: Full Stack Dev
    - **Dependências**: Supabase Storage setup

20. **Relatórios PDF Avançados**
    - Templates profissionais
    - Logo/branding
    - Gráficos no PDF
    - **Estimativa**: 8h
    - **Responsável**: Frontend Dev

21. **Dashboard Analytics Avançado**
    - Gráficos interativos
    - Filtros por período
    - Comparação mensal
    - Export para Excel
    - **Estimativa**: 12h
    - **Responsável**: Frontend Dev

### Gestão de Parceiros
22. **Integrar Partners com Eventos**
    - Adicionar parceiro ao criar evento
    - Histórico de eventos por parceiro
    - Avaliação de parceiros
    - **Estimativa**: 8h
    - **Responsável**: Full Stack Dev

---

## 🟢 BAIXA PRIORIDADE - Backlog Futuro

### Features Avançadas
23. **Telemedicina**
    - Integração Whereby
    - Botão de videochamada no agendamento
    - Gravação de consultas (opcional)
    - **Estimativa**: 20h
    - **Responsável**: Full Stack Dev

24. **Gamificação**
    - Sistema de pontos
    - Badges
    - Streak counter
    - **Estimativa**: 16h
    - **Responsável**: Full Stack Dev

25. **Marketplace**
    - Produtos recomendados
    - Integração com parceiros
    - Comissão tracking
    - **Estimativa**: 40h+
    - **Responsável**: Full Stack Team

### Integrações
26. **Google Calendar Sync**
    - OAuth Google
    - Sync bidirecional
    - **Estimativa**: 12h
    - **Responsável**: Backend Dev

27. **Integração Contábil**
    - Export para software contábil
    - Notas fiscais automáticas
    - **Estimativa**: 24h+
    - **Responsável**: Backend Dev + Contador

---

## 🧪 TESTES - Contínuo

### Unit Tests
28. **Hooks Testing**
    - useEventos, usePrestadores, useParticipantes
    - useAuth, usePermissions
    - **Estimativa**: 8h
    - **Responsável**: Frontend Dev

29. **Utils Testing**
    - Validações Zod
    - Funções de formatação
    - Helpers
    - **Estimativa**: 4h
    - **Responsável**: Frontend Dev

### E2E Tests
30. **Playwright - Fluxos Críticos**
    - Login/Logout
    - Criar evento
    - Agendar consulta
    - Comprar voucher (quando implementado)
    - **Estimativa**: 12h
    - **Responsável**: QA/Dev

### Performance Tests
31. **Load Testing**
    - k6 ou Artillery
    - Testar 100+ usuários simultâneos
    - Identificar gargalos
    - **Estimativa**: 8h
    - **Responsável**: Backend Dev

---

## 📊 Métricas de Sucesso

### Técnicas
- [ ] Lighthouse Score > 90
- [ ] Test Coverage > 80%
- [ ] API Response Time < 500ms
- [ ] Error Rate < 1%
- [ ] Uptime > 99.5%

### Negócio
- [ ] Conversão de vouchers > 5%
- [ ] Taxa de no-show < 10%
- [ ] NPS > 8
- [ ] Retenção mensal > 70%

### UX
- [ ] Time to Interactive < 3s
- [ ] User satisfaction > 4.5/5
- [ ] Feature adoption > 60%

---

## 🔄 Processo de Desenvolvimento

### Definition of Done
Uma task é considerada completa quando:
- [ ] Código implementado e revisado
- [ ] Testes unitários escritos (quando aplicável)
- [ ] Testes E2E escritos (para fluxos críticos)
- [ ] Documentação atualizada
- [ ] Code review aprovado
- [ ] Deploy em staging e testado
- [ ] Performance verificada
- [ ] Sem regressões

### Code Review Checklist
- [ ] Código segue padrões do projeto
- [ ] Sem hardcoded secrets
- [ ] Validação de inputs implementada
- [ ] Error handling apropriado
- [ ] Performance considerada
- [ ] Acessibilidade verificada
- [ ] Responsividade testada

---

## 📅 Timeline Sugerido

### Sprint 1 (Semana 1-2): Segurança & Fundação
- Tasks: #1, #2, #3, #4, #5, #6, #7
- **Goal**: Sistema seguro e performático

### Sprint 2 (Semana 3-4): Vouchers & Pagamentos
- Tasks: #8, #9, #10, #14
- **Goal**: Monetização funcionando

### Sprint 3 (Semana 5-6): IA & Automação
- Tasks: #11, #12, #13
- **Goal**: Features inteligentes

### Sprint 4 (Semana 7-8): UX & Refinamento
- Tasks: #15, #16, #17, #18, #20, #21
- **Goal**: Experiência polida

### Sprint 5 (Semana 9-10): Features Avançadas
- Tasks: #19, #22, #23
- **Goal**: Diferenciação competitiva

### Sprint 6+ (Semana 11+): Expansão
- Tasks: #24, #25, #26, #27
- **Goal**: Crescimento e escala

---

## 🚨 Dívidas Técnicas Conhecidas

1. **Mock Data em Vouchers**
   - Precisa migrar para DB real
   - **Prioridade**: Alta (#9)

2. **FileUpload Mock**
   - Implementar storage real
   - **Prioridade**: Crítica (#7)

3. **Smart AI Mock**
   - Integrar com Lovable AI real
   - **Prioridade**: Alta (#11)

4. **Falta de Testes E2E**
   - Cobertura atual < 20%
   - **Prioridade**: Média (#30)

5. **Bundle Size Grande**
   - Verificar imports desnecessários
   - Tree shaking
   - **Prioridade**: Média (#6)

---

## 💡 Ideias Futuras (Não Priorizadas)

- Integração com wearables (Apple Watch, Fitbit)
- IA para análise de movimento (computer vision)
- Realidade Aumentada para exercícios
- Marketplace de fisioterapeutas
- Sistema de avaliações e reviews
- Blog/conteúdo educativo
- Programa de indicação com recompensas
- Multi-clínica (white-label)
- API pública para integrações
- Mobile app nativo (React Native)

---

*Backlog atualizado em: 2025-10-17*
*Próxima revisão: Sprint planning*
