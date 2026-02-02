# Funcionalidade: Prontuário Eletrônico (SOAP)

## Visão Geral

Sistema completo de prontuário eletrônico usando o método SOAP, com assinaturas digitais e trilhas de auditoria.

## Método SOAP

### Subjective (S)
- Queixa principal do paciente
- História atual
- Sintomas relatados

### Objective (O)
- Exame físico
- Medidas (ROM, força, etc)
- Testes funcionais
- Nível de dor (0-10)

### Assessment (A)
- Diagnóstico fisioterapêutico
- Análise do quadro
- Prognóstico

### Plan (P)
- Objetivos do tratamento
- Condutas propostas
- Exercícios prescritos
- Orientações

## Recursos

- ✅ Editor de SOAP completo
- ✅ Mapa de dor interativo
- ✅ Anexos (imagens, documentos)
- ✅ Assinatura digital
- ✅ Trilha de auditoria
- ✅ Histórico de evoluções
- ✅ Templates de evolução
- ✅ Exportação PDF

## Páginas

- `/medical-record` - Lista de evoluções
- `/medical-record/:id` - Detalhes da evolução
- `/medical-record/new` - Nova evolução

## Componentes

- `SOAPForm` - Formulário SOAP
- `PainMap` - Mapa de dor interativo
- `SignatureCanvas` - Assinatura digital
- `EvolutionTimeline` - Timeline de evoluções

## API (Firestore)

```typescript
// GET evolutions
const snapshot = await getDocs(
  query(
    collection(db, 'sessions'),
    where('patient_id', '==', patientId),
    orderBy('created_at', 'desc')
  )
);

// POST evolution
const ref = await addDoc(collection(db, 'sessions'), {
  patient_id, subjective, objective, assessment, plan, pain_level, ...
});

// PATCH sign
await updateDoc(doc(db, 'sessions', id), {
  status: 'signed', signature_data, signed_at: serverTimestamp()
});
```

## Veja Também

- [Pacientes](./pacientes.md) - Gestão de pacientes
- [Avaliações](./avaliacoes.md) - Fichas de avaliação
