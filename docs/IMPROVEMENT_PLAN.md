# Plano de Melhoria para FisioFlow

## 📋 Checklist de Melhorias
- [x] Analisar dependências e remover duplicatas
- [x] Auditar secrets e rotacionar credenciais expostas
- [ ] Implementar CI/CD com GitHub Actions
- [ ] Expandir cobertura de testes unitários e E2E
- [ ] Consolidar documentação técnica
- [ ] Otimizar bundle size e performance
- [ ] Migrar Telemedicina para Cloudflare RealtimeKit
- [ ] Documentar schema de banco de dados
- [ ] Separar dependências mobile

## 🔧 Áreas de Melhoria Identificadas

### 1. Gestão de Dependências
- Auditar e remover dependências não utilizadas
- Consolidar dependências compartilhadas

### 2. Segurança
- Rotacionar secrets LiveKit expostas
- Usar wrangler secret put para gerenciamento seguro

### 3. CI/CD
- Criar workflows GitHub Actions para lint, test, build, deploy

### 4. Testes
- Adicionar testes unitários para componentes críticos
- Implementar coverage mínima de 80%

### 5. Documentação
- Consolidar documentação em estrutura clara
- Atualizar ADRs com decisões recentes

### 5. Performance
- Analisar bundle size com ANALYZE=true
- Implementar code splitting e lazy loading

### 6. Telemedicina
- Migrar de Jitsi para Cloudflare RealtimeKit (Fase 4.2)

### 7. Banco de Dados
- Documentar relacionamentos e mudanças de schema

### 8. Mobile
- Separar dependências mobile em workspace específico