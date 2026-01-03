# 📋 Guia de Testes Manuais - Fluxos Melhorados

Este documento descreve os passos para testar manualmente os fluxos melhorados de cadastro de pacientes, agendamento e evolução de sessões.

## 🔧 Pré-requisitos

1. Ter uma conta de usuário autenticada
2. Estar vinculado a uma organização
3. Ter permissões adequadas (admin ou fisioterapeuta)

---

## 1. ✅ Teste: Cadastro de Paciente

### Objetivo
Validar o cadastro de novo paciente com máscaras, validações e multi-tenancy.

### Passos

1. **Acessar página de Pacientes**
   - Navegar para `/patients`
   - Clicar no botão "Novo Paciente"

2. **Testar Máscaras de Input**
   - **CPF**: Digitar `12345678901` e verificar que formata para `123.456.789-01`
   - **Telefone**: Digitar `11987654321` e verificar que formata para `(11) 98765-4321`

3. **Testar Validação de CPF Opcional**
   - Deixar campo CPF vazio
   - Preencher outros campos obrigatórios
   - Verificar que formulário aceita (CPF é opcional)

4. **Preencher Formulário Completo**
   - Nome: "João Silva Teste"
   - Email: "joao.teste@example.com"
   - Telefone: "11987654321" (verificar máscara)
   - CPF: "12345678901" (verificar máscara)
   - Data de Nascimento: Selecionar uma data
   - Gênero: Selecionar uma opção
   - Condição Principal: "Lombalgia"
   - Preencher outros campos opcionais

5. **Submeter Formulário**
   - Clicar em "Cadastrar Paciente"
   - Verificar toast de sucesso
   - Verificar que modal fecha
   - Verificar que paciente aparece na lista

6. **Testar Cenários de Erro**
   - **CPF Duplicado**: Tentar cadastrar paciente com CPF já existente
     - Esperado: Mensagem "Já existe um paciente com este CPF ou email cadastrado"
   - **Sem Organização**: Desvincular usuário da organização e tentar cadastrar
     - Esperado: Mensagem "Organização não encontrada"

### ✅ Checklist

- [ ] Máscara de CPF funciona corretamente
- [ ] Máscara de telefone funciona corretamente
- [ ] CPF vazio é aceito (campo opcional)
- [ ] Validações de campos obrigatórios funcionam
- [ ] Paciente é cadastrado com sucesso
- [ ] Organization_id é incluído na inserção (verificar no banco)
- [ ] Mensagens de erro específicas aparecem
- [ ] Toast de sucesso aparece
- [ ] Lista de pacientes é atualizada

---

## 2. 📅 Teste: Agendamento de Consulta

### Objetivo
Validar criação e atualização de agendamentos com organization_id e validações.

### Passos

1. **Acessar Agenda**
   - Navegar para `/agenda` ou `/schedule`
   - Clicar em "Novo Agendamento" ou selecionar slot no calendário

2. **Criar Novo Agendamento**
   - Selecionar paciente (cadastrado anteriormente)
   - Selecionar data futura
   - Selecionar horário (ex: 10:00)
   - Definir duração (ex: 60 minutos)
   - Selecionar tipo de consulta
   - Preencher observações (opcional)
   - Clicar em "Salvar" ou "Agendar"

3. **Verificar Sucesso**
   - Toast de sucesso aparece
   - Agendamento aparece no calendário
   - Detalhes do agendamento estão corretos

4. **Testar Conflito de Horário**
   - Tentar criar outro agendamento no mesmo horário
   - Esperado: Mensagem de erro "Já existe um agendamento neste horário"

5. **Atualizar Agendamento**
   - Abrir agendamento existente
   - Alterar horário ou data
   - Salvar alterações
   - Verificar que atualização foi aplicada

6. **Testar Cenários de Erro**
   - **Sem Organização**: Desvincular usuário e tentar agendar
     - Esperado: Mensagem "Organização não encontrada"
   - **Conflito de Horário**: Tentar agendar em horário ocupado
     - Esperado: Mensagem "Conflito de Horário"

### ✅ Checklist

- [ ] Agendamento é criado com sucesso
- [ ] Organization_id é incluído na criação (verificar no banco)
- [ ] Conflito de horário é detectado
- [ ] Agendamento é atualizado corretamente
- [ ] Organization_id é usado no filtro de atualização (verificar no banco)
- [ ] Mensagens de erro específicas aparecem
- [ ] Toast de sucesso/erro funciona

---

## 3. 📝 Teste: Evolução de Sessão (SOAP)

### Objetivo
Validar criação de evolução SOAP com validações e multi-tenancy.

### Passos

1. **Acessar Evolução**
   - Ter um agendamento "Agendado" ou "Confirmado"
   - Clicar no agendamento e selecionar "Iniciar Sessão" ou "Evolução"
   - Ou navegar para `/session-evolution/:appointmentId`

2. **Preencher Formulário SOAP**
   - **Subjetivo**: Preencher queixa do paciente
   - **Objetivo**: Preencher exame físico
   - **Avaliação**: Preencher avaliação/diagnóstico
   - **Plano**: Preencher plano de tratamento

3. **Testar Validação com Espaços em Branco**
   - Preencher campos SOAP apenas com espaços: `"   "`
   - Tentar salvar
   - Esperado: Mensagem "Preencha todos os campos do SOAP"

4. **Salvar Evolução**
   - Preencher todos os campos SOAP com conteúdo válido
   - Clicar em "Salvar"
   - Verificar toast de sucesso
   - Verificar que agendamento muda status para "Realizado"

5. **Verificar Dados no Banco**
   - Verificar que registro SOAP foi criado
   - Verificar que appointment foi atualizado com status "Realizado"
   - Verificar que organization_id foi usado no update do appointment

6. **Testar Cenários de Erro**
   - **Sem Organização**: Desvincular usuário e tentar salvar
     - Esperado: Mensagem "Organização não encontrada"
   - **Campos Vazios**: Tentar salvar com campos SOAP vazios
     - Esperado: Mensagem "Preencha todos os campos do SOAP"
   - **Sem Permissão**: Tentar salvar sem permissão (testar RLS)
     - Esperado: Mensagem de erro de permissão

### ✅ Checklist

- [ ] Formulário SOAP carrega corretamente
- [ ] Validação de campos vazios funciona (incluindo apenas espaços)
- [ ] Evolução é salva com sucesso
- [ ] Registro SOAP é criado no banco
- [ ] Appointment é atualizado com status "Realizado"
- [ ] Organization_id é usado no update do appointment (verificar no banco)
- [ ] Mensagens de erro específicas aparecem
- [ ] Toast de sucesso aparece

---

## 4. 🔄 Teste: Fluxo Completo End-to-End

### Objetivo
Testar o fluxo completo desde cadastro até evolução.

### Passos

1. **Cadastrar Novo Paciente**
   - Seguir passos da seção 1
   - Anotar ID do paciente cadastrado

2. **Agendar Consulta para o Paciente**
   - Seguir passos da seção 2
   - Usar paciente cadastrado no passo 1
   - Anotar ID do agendamento criado

3. **Realizar Evolução da Sessão**
   - Seguir passos da seção 3
   - Usar agendamento criado no passo 2
   - Preencher evolução SOAP completa

4. **Verificar Integridade dos Dados**
   - Verificar no banco que:
     - Paciente tem `organization_id` correto
     - Agendamento tem `organization_id` correto
     - Registro SOAP foi criado
     - Appointment foi atualizado para "Realizado"
     - Todos os dados estão isolados por organização

### ✅ Checklist

- [ ] Fluxo completo funciona sem erros
- [ ] Dados estão corretos em todas as etapas
- [ ] Multi-tenancy está funcionando (isolação por organização)
- [ ] Performance está aceitável
- [ ] UX está fluida

---

## 5. 🐛 Testes de Cenários de Erro

### Organização Não Encontrada

1. **Desvincular usuário da organização** (no banco ou interface admin)
2. **Tentar realizar qualquer ação**:
   - Cadastrar paciente
   - Criar agendamento
   - Salvar evolução
3. **Verificar**: Mensagem "Organização não encontrada" aparece

### Validações de Formulário

1. **CPF Inválido**: Digitar CPF com formato incorreto
   - Esperado: Mensagem de erro de validação
2. **Email Inválido**: Digitar email sem @
   - Esperado: Mensagem de erro de validação
3. **Campos Obrigatórios**: Deixar campos obrigatórios vazios
   - Esperado: Mensagens de erro específicas

### Permissões (RLS)

1. **Testar acesso de usuário de outra organização**
2. **Verificar**: Usuário não consegue ver/editar dados de outra organização

---

## 📊 Métricas de Sucesso

- ✅ Todos os testes passam
- ✅ Mensagens de erro são claras e específicas
- ✅ Multi-tenancy funciona corretamente
- ✅ Performance está aceitável (< 2s para operações)
- ✅ UX está fluida e intuitiva

---

## 🔍 Verificação no Banco de Dados

Para verificar que os dados estão corretos, execute estas queries:

```sql
-- Verificar paciente com organization_id
SELECT id, name, organization_id FROM patients WHERE name LIKE '%Teste%';

-- Verificar agendamento com organization_id
SELECT id, patient_id, appointment_date, organization_id 
FROM appointments 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar evolução SOAP
SELECT id, patient_id, appointment_id, created_by 
FROM soap_records 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar que appointment foi atualizado
SELECT id, status, organization_id 
FROM appointments 
WHERE status = 'Realizado' 
ORDER BY updated_at DESC 
LIMIT 5;
```

---

## 📝 Notas

- Sempre testar em ambiente de desenvolvimento primeiro
- Testar com diferentes tipos de usuários (admin, fisioterapeuta, etc.)
- Testar em diferentes navegadores (Chrome, Firefox, Safari)
- Testar em diferentes dispositivos (desktop, tablet, mobile)
- Documentar qualquer bug encontrado
- Validar que multi-tenancy isola dados corretamente

