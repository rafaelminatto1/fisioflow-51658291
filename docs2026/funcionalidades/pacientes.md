# Funcionalidade: Gestão de Pacientes

## Visão Geral

Sistema completo de gestão de pacientes com histórico médico, documentos e conformidade com LGPD.

## Recursos Principais

### Cadastro de Pacientes

- Informações pessoais (nome, email, telefone)
- Data de nascimento e gênero
- Endereço completo
- Informações de convênio
- Histórico médico
- Alergias
- Tipo sanguíneo
- Contato de emergência

### Funcionalidades

- ✅ Listagem com busca e filtros
- ✅ Formulário de cadastro/editação
- ✅ Validação de CPF/telefone
- ✅ Upload de documentos e exames
- ✅ Mapa de dor interativo
- ✅ Histórico de evoluções
- ✅ Acompanhamento de agendamentos
- ✅ LGPD compliant

## Páginas

- `/patients` - Lista de pacientes
- `/patients/new` - Novo paciente
- `/patients/:id` - Detalhes do paciente

## Componentes

- `PatientCard` - Card de paciente
- `PatientForm` - Formulário de cadastro
- `PatientList` - Lista de pacientes
- `PatientSearch` - Busca de pacientes

## API (Firestore)

```typescript
// GET patients
const snapshot = await getDocs(collection(db, 'patients'));

// POST patient
const ref = await addDoc(collection(db, 'patients'), patient);

// PATCH patient
await updateDoc(doc(db, 'patients', id), changes);
```

## Veja Também

- [Prontuário](./prontuario.md) - Evoluções SOAP
- [Agenda](./agenda.md) - Agendamentos
