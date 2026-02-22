# ⚡ Guia Rápido - Configuração de Protocolos

## 🚀 Setup em 5 Minutos

---

## 1️⃣ Criar Índices no Firestore

### Via Firebase Console:

1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto: `fisioflow-migration`
3. Vá em **Firestore Database** → **Indexes**
4. Clique em **Create Index**

### Índice 1: treatment_protocols
```
Collection ID: treatment_protocols
Fields:
  - professionalId (Ascending)
  - isActive (Ascending)
  - createdAt (Descending)
Query scope: Collection
```

### Índice 2: patient_protocols
```
Collection ID: patient_protocols
Fields:
  - patientId (Ascending)
  - isActive (Ascending)
  - createdAt (Descending)
Query scope: Collection
```

**Tempo de criação**: ~2-5 minutos cada

---

## 2️⃣ Configurar Regras de Segurança

### Via Firebase Console:

1. Vá em **Firestore Database** → **Rules**
2. Adicione as seguintes regras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Treatment Protocols
    match /treatment_protocols/{protocolId} {
      // Qualquer usuário autenticado pode ler
      allow read: if request.auth != null;
      
      // Apenas o criador pode criar
      allow create: if request.auth != null && 
                      request.resource.data.professionalId == request.auth.uid;
      
      // Apenas o criador pode atualizar/excluir
      allow update, delete: if request.auth != null && 
                              resource.data.professionalId == request.auth.uid;
    }
    
    // Patient Protocols
    match /patient_protocols/{patientProtocolId} {
      // Qualquer usuário autenticado pode ler
      allow read: if request.auth != null;
      
      // Apenas o profissional pode criar
      allow create: if request.auth != null && 
                      request.resource.data.professionalId == request.auth.uid;
      
      // Apenas o profissional pode atualizar/excluir
      allow update, delete: if request.auth != null && 
                              resource.data.professionalId == request.auth.uid;
    }
  }
}
```

3. Clique em **Publish**

---

## 3️⃣ Testar Funcionalidades

### Teste 1: Criar Protocolo
1. Abra o app
2. Vá em **Perfil** → **Protocolos de Tratamento**
3. Clique no **+**
4. Preencha:
   - Nome: "Teste de Protocolo"
   - Categoria: "Ortopedia"
   - Descrição: "Protocolo de teste"
5. Clique em **Salvar**
6. ✅ Deve aparecer na lista

### Teste 2: Editar Protocolo
1. Clique no protocolo criado
2. Clique no ícone de editar (lápis)
3. Altere o nome
4. Clique em **Salvar**
5. ✅ Deve atualizar na lista

### Teste 3: Duplicar Protocolo
1. Abra os detalhes do protocolo
2. Clique em **Duplicar**
3. Confirme
4. ✅ Deve criar uma cópia com "(Cópia)" no nome

### Teste 4: Aplicar a Paciente
1. Na lista de protocolos, clique em **Aplicar a Paciente**
2. Selecione um paciente
3. Adicione observações (opcional)
4. Clique em **Aplicar**
5. ✅ Deve confirmar sucesso

### Teste 5: Excluir Protocolo
1. Abra os detalhes do protocolo
2. Clique em **Excluir**
3. Confirme
4. ✅ Deve remover da lista

---

## 4️⃣ Verificar Dados no Firestore

### Via Firebase Console:

1. Vá em **Firestore Database** → **Data**
2. Verifique as collections:
   - `treatment_protocols` - Deve ter seus protocolos
   - `patient_protocols` - Deve ter protocolos aplicados

### Estrutura Esperada:

#### treatment_protocols:
```json
{
  "name": "Reabilitação de Joelho",
  "description": "Protocolo completo...",
  "category": "Ortopedia",
  "condition": "Pós-operatório",
  "exercises": [
    {
      "exerciseId": "ex1",
      "sets": 3,
      "reps": 15,
      "order": 1
    }
  ],
  "professionalId": "user123",
  "isTemplate": true,
  "isActive": true,
  "createdAt": "2026-02-21T10:00:00Z",
  "updatedAt": "2026-02-21T10:00:00Z"
}
```

#### patient_protocols:
```json
{
  "patientId": "patient123",
  "protocolId": "protocol123",
  "professionalId": "user123",
  "startDate": "2026-02-21T10:00:00Z",
  "isActive": true,
  "progress": 0,
  "notes": "Observações do profissional",
  "createdAt": "2026-02-21T10:00:00Z",
  "updatedAt": "2026-02-21T10:00:00Z"
}
```

---

## 5️⃣ Troubleshooting

### Erro: "Missing index"
**Solução**: Aguarde a criação dos índices (2-5 minutos) ou clique no link do erro para criar automaticamente.

### Erro: "Permission denied"
**Solução**: Verifique se as regras de segurança foram publicadas corretamente.

### Erro: "Protocol not found"
**Solução**: Verifique se o protocolo existe no Firestore e se o `professionalId` está correto.

### Lista vazia após criar protocolo
**Solução**: 
1. Verifique se o índice foi criado
2. Faça pull-to-refresh na lista
3. Verifique o console do app para erros

### Protocolo não aparece após duplicar
**Solução**: Faça pull-to-refresh na lista. O cache pode demorar alguns segundos para atualizar.

---

## 📊 Monitoramento

### Verificar Uso:
1. Firebase Console → **Firestore Database** → **Usage**
2. Monitore:
   - Leituras
   - Escritas
   - Exclusões

### Limites Gratuitos (Spark Plan):
- 50,000 leituras/dia
- 20,000 escritas/dia
- 20,000 exclusões/dia
- 1 GB armazenamento

---

## ✅ Checklist de Configuração

- [ ] Índice `treatment_protocols` criado
- [ ] Índice `patient_protocols` criado
- [ ] Regras de segurança publicadas
- [ ] Teste de criar protocolo ✅
- [ ] Teste de editar protocolo ✅
- [ ] Teste de duplicar protocolo ✅
- [ ] Teste de aplicar a paciente ✅
- [ ] Teste de excluir protocolo ✅
- [ ] Dados visíveis no Firestore ✅

---

## 🎉 Pronto!

Seu sistema de protocolos está configurado e funcionando!

**Próximos passos**:
1. Criar protocolos reais
2. Aplicar a pacientes
3. Monitorar uso
4. Coletar feedback

---

**Tempo total de setup**: ~5-10 minutos
**Dificuldade**: ⭐⭐ (Fácil)
**Status**: PRONTO PARA USO 🚀

