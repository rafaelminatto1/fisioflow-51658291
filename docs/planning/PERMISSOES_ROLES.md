# 📋 Matriz de Permissões por Role - FisioFlow

## 🔐 Tabela de Permissões (Firestore + Backend)

| Recurso | Admin | Fisioterapeuta | Estagiario | Recepcionista | Paciente |
|---------|-------|----------------|------------|---------------|----------|
| **USUÁRIOS** |
| Ver todos usuários | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver próprio perfil | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar usuários | ✅ | ❌ | ❌ | ❌ | ❌ |
| Atualizar usuários | ✅ | ❌ | ❌ | ❌ | ❌ |
| Deletar usuários | ✅ | ❌ | ❌ | ❌ | ❌ |
| **PERFIS** |
| Ver perfis | ✅ | ✅ | ✅ | ✅ | ✅ |
| Atualizar próprio perfil | ✅ | ✅ | ✅ | ✅ | ✅ |
| **PACIENTES** |
| Listar pacientes | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver paciente | ✅ | ✅ | ✅ | ✅ | Próprio |
| Criar paciente | ✅ | ✅ | ✅ | ✅ | ❌ |
| Atualizar paciente | ✅ | ✅ | ❌ | ❌ | Próprio |
| Deletar paciente | ✅ | ❌ | ❌ | ❌ | ❌ |
| **AGENDAMENTOS** |
| Listar agendamentos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver agendamento | ✅ | ✅ | ✅ | ✅ | Próprio |
| Criar agendamento | ✅ | ✅ | ✅ | ✅ | ❌ |
| Atualizar agendamento | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cancelar agendamento | ✅ | ✅ | ❌ | ❌ | ❌ |
| **EXERCÍCIOS** |
| Ver biblioteca | ✅ | ✅ | ✅ | ❌ | ❌ |
| Criar exercício | ✅ | ✅ | ❌ | ❌ | ❌ |
| Atualizar exercício | ✅ | Criador | ❌ | ❌ | ❌ |
| Deletar exercício | ✅ | ❌ | ❌ | ❌ | ❌ |
| **PRONTUÁRIO/EVOLUÇÕES** |
| Ver prontuário | ✅ | ✅ | ✅ | ❌ | Próprio |
| Criar evolução | ✅ | ✅ | ❌ | ❌ | ❌ |
| Atualizar evolução | ✅ | Próprio | ❌ | ❌ | ❌ |
| **AVALIAÇÕES** |
| Ver avaliações | ✅ | ✅ | ✅ | ❌ | Próprio |
| Criar avaliação | ✅ | ✅ | ❌ | ❌ | ❌ |
| **FINANCEIRO** |
| Ver pagamentos | ✅ | ❌ | ❌ | ❌ | ❌ |
| Criar pagamento | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver vouchers | ✅ | Próprio | ❌ | ❌ | Próprio |
| **CONFIGURAÇÕES** |
| Ver configurações | ✅ | Públicas | Públicas | Públicas | Públicas |
| Atualizar configurações | ✅ | ❌ | ❌ | ❌ | ❌ |
| **AUDITORIA** |
| Ver logs de auditoria | ✅ | ❌ | ❌ | ❌ | ❌ |
| **ORGANIZAÇÕES** |
| Ver organizações | ✅ | ✅ | ✅ | ❌ | ❌ |
| Atualizar organizações | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 👥 Usuários de Teste Criados

### Admin
- **Nome:** Rafael Minatto
- **Email:** REDACTED_EMAIL
- **Senha:** (sua senha)
- **UID:** sj9b11xOjPT8Q34pPHBMUIPzvQQ2

### Fisioterapeutas
1. **Dr. Carlos Eduardo Silva**
   - Email: carlos.silva@clinicaprincipal.com.br
   - Senha: Fisio123!
   - CREFITO: 12345-FISIO
   - Especialidades: Ortopedia, Traumatologia, Reabilitação Esportiva

2. **Dra. Mariana Santos**
   - Email: mariana.santos@clinicaprincipal.com.br
   - Senha: Fisio123!
   - CREFITO: 54321-FISIO
   - Especialidades: Neurologia, Pediatria, Bobath

### Recepcionista
- **Nome:** Fernanda Oliveira
- Email: fernanda@clinicaprincipal.com.br
- Senha: Fisio123!

### Estagiário
- **Nome:** Lucas Mendes
- Email: lucas.mendes@clinicaprincipal.com.br
- Senha: Fisio123!

### Paciente
- **Nome:** Roberto Almeida
- Email: roberto.almeida@gmail.com
- Senha: Fisio123!

---

## 🧪 CHECKLIST DE TESTE MANUAL

### Teste 1: Admin (Rafael Minatto)
- [ ] Login OK
- [ ] Dashboard completo visível
- [ ] Menu Administração visível
- [ ] Pode criar/editar/deletar usuários
- [ ] Pode acessar Financeiro completo
- [ ] Pode ver Logs de Auditoria
- [ ] Pode editar Configurações

### Teste 2: Fisioterapeuta (Dr. Carlos)
- [ ] Login OK
- [ ] Dashboard clínico visível
- [ ] Pode ver lista de Pacientes
- [ ] Pode criar Pacientes
- [ ] Pode criar Evoluções/Avaliações
- [ ] Pode ver Exercícios
- [ ] Pode criar Exercícios
- [ ] NÃO vê Financeiro
- [ ] NÃO vê Administração
- [ ] NÃO pode deletar Pacientes

### Teste 3: Fisioterapeuta (Dra. Mariana)
- [ ] Login OK
- [ ] Mesmas permissões que Dr. Carlos
- [ ] Apenas seus próprios exercícios são editáveis

### Teste 4: Recepcionista (Fernanda)
- [ ] Login OK
- [ ] Pode ver Agenda
- [ ] Pode criar Agendamentos
- [ ] Pode ver lista de Pacientes (readonly)
- [ ] NÃO pode criar/editar Prontuário
- [ ] NÃO pode acessar Financeiro
- [ ] NÃO pode acessar Administração

### Teste 5: Estagiário (Lucas)
- [ ] Login OK
- [ ] Pode ver Pacientes (readonly)
- [ ] Pode ver Prontuário existente
- [ ] NÃO pode criar Evoluções
- [ ] NÃO pode editar dados clínicos
- [ ] Pode visualizar mas não modificar

### Teste 6: Paciente (Roberto)
- [ ] Login OK
- [ ] Vê apenas seu próprio Prontuário
- [ ] Vê seus próprios Agendamentos
- [ ] Pode ver Exercícios prescritos
- [ ] NÃO vê outros Pacientes
- [ ] NÃO vê Financeiro
- [ ] NÃO vê Administração

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

1. **Estagiários** têm acesso de leitura mas NÃO podem escrever dados clínicos
2. **Recepcionistas** podem gerenciar agenda mas NÃO acessam prontuário
3. **Pacientes** só veem seus próprios dados
4. **Admin** tem acesso total irrestrito
5. **Fisioterapeutas** podem criar/editar dados clínicos mas não financeiro

---

## 📱 TESTAR NOTIFICAÇÕES WHATSAPP

### Funções disponíveis:
- `testWhatsAppMessage` - Enviar mensagem de teste
- `testWhatsAppTemplate` - Testar template WhatsApp

### Como testar:
```bash
# Via Firebase Functions shell
firebase functions:shell --project fisioflow-migration

# Depois no shell:
await testWhatsAppMessage({ phone: '5511999999999', message: 'Teste' })
```

Ou via chamada direta:
```bash
curl -X POST https://southamerica-east1-fisioflow-migration.cloudfunctions.net/testWhatsAppMessage \
  -H "Content-Type: application/json" \
  -d '{"phone": "+5511987654321", "message": "Teste de notificação"}'
```

### Secrets Configuradas:
- ✅ WHATSAPP_ACCESS_TOKEN
- ✅ WHATSAPP_PHONE_NUMBER_ID
