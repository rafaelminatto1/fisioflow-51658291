# MAPEAMENTO COMPLETO DO FISIOFLOW

## STATUS DA INVESTIGAÇÃO
**Data:** 2025-02-01
**Objetivo:** Testar todos os fluxos e CRUDs do sistema para identificar erros (como React #185)

---

## 1. FLUXO DE PACIENTES

### Arquivos Principais
| Tipo | Caminho |
|------|---------|
| Página (lista) | `apps/professional-ios/app/(tabs)/patients.tsx` |
| Página (novo) | `apps/professional-ios/app/(drawer)/patients/new.tsx` |
| Página (detalhes) | `apps/professional-ios/app/(drawer)/patients/[id].tsx` |
| Componente Card | `apps/professional-ios/components/PatientCard.tsx` |
| Componente Selector | `apps/professional-ios/components/PatientSelector.tsx` |
| Hook | `apps/professional-ios/hooks/usePatients.ts` |
| API | `functions/src/api/patients.ts` |

### Rotas
- `/patients` - Listagem
- `/patients/new` - Criação
- `/patients/[id]` - Detalhes/Edição

### Status: ⏳ PENDENTE

---

## 2. FLUXO DE AGENDAMENTOS

### Arquivos Principais
| Tipo | Caminho |
|------|---------|
| Página (agenda) | `apps/professional-ios/app/(tabs)/agenda.tsx` |
| Página (novo) | `apps/professional-ios/app/(drawer)/agenda/new.tsx` |
| Componente Card | `apps/professional-ios/components/AppointmentCard.tsx` |
| Componente Picker | `apps/professional-ios/components/DateTimePicker.tsx` |
| Hook | `apps/professional-ios/hooks/useAppointments.ts` |
| API | `functions/src/api/appointments.ts` |

### Rotas
- `/agenda` - Lista de agenda
- `/agenda/new` - Novo agendamento

### Status: ⏳ PENDENTE
**ERRO CONHECIDO:** React Error #185 ao criar agendamento

---

## 3. FLUXO DE EVOLUÇÕES

### Arquivos Principais
| Tipo | Caminho |
|------|---------|
| Página (nova) | `apps/professional-ios/app/(drawer)/evolutions/new.tsx` |
| Página (movimento) | `apps/professional-ios/app/(drawer)/movement-analysis/index.tsx` |
| Componente Sinais | `apps/professional-ios/components/VitalSignsInput.tsx` |
| Componente Exame | `apps/professional-ios/components/ObjectiveExamForm.tsx` |
| API | `functions/src/api/assessments.ts` |
| API | `functions/src/medical/records.ts` |

### Rotas
- `/evolutions/new` - Nova evolução
- `/movement-analysis` - Análise de movimento

### Status: ⏳ PENDENTE

---

## 4. FLUXO DE AVALIAÇÕES

### Arquivos Principais
| Tipo | Caminho |
|------|---------|
| Componente Sinais | `apps/professional-ios/components/VitalSignsInput.tsx` |
| Componente Exame | `apps/professional-ios/components/ObjectiveExamForm.tsx` |
| API | `functions/src/api/assessments.ts` |

### Observações
Avaliações são integradas no fluxo de evoluções

### Status: ⏳ PENDENTE

---

## 5. OUTROS CRUDS

### Protocolos
| Tipo | Caminho |
|------|---------|
| Página | `apps/professional-ios/app/(drawer)/protocols/index.tsx` |
| Lib | `apps/professional-ios/lib/protocolTemplates.ts` |

### Planos de Exercícios
| Tipo | Caminho |
|------|---------|
| Página | `apps/professional-ios/app/(drawer)/exercise-plans/new.tsx` |
| Selector | `apps/professional-ios/components/ExerciseSelector.tsx` |
| Card | `apps/professional-ios/components/ui/ExerciseCard.tsx` |
| Hook | `apps/professional-ios/hooks/useExercises.ts` |
| API | `functions/src/api/exercises.ts` |

### Financeiro
| Tipo | Caminho |
|------|---------|
| API | `functions/src/api/financial.ts` |
| API | `functions/src/api/payments.ts` |
| Stripe | `functions/src/stripe/webhook.ts` |
| Vouchers | `functions/src/stripe/vouchers.ts` |

### Usuários
| Tipo | Caminho |
|------|---------|
| Página (perfil) | `apps/professional-ios/app/(tabs)/profile.tsx` |
| Página (editar) | `apps/professional-ios/app/(drawer)/profile/edit.tsx` |
| Página (config) | `apps/professional-ios/app/(drawer)/profile/[setting].tsx` |
| API | `functions/src/api/users.ts` |
| API | `functions/src/api/profile.ts` |

### Status: ⏳ PENDENTE

---

## 6. FLUXO DO PACIENTE (App Mobile)

### Autenticação
| Arquivo | Rota |
|---------|------|
| `patient-app/app/(auth)/login.tsx` | `/login` |
| `patient-app/app/(auth)/register.tsx` | `/register` |
| `patient-app/app/(auth)/link-professional.tsx` | `/link-professional` |

### Área Logada
| Arquivo | Rota |
|---------|------|
| `patient-app/app/(tabs)/appointments.tsx` | `/appointments` |
| `patient-app/app/(tabs)/exercises.tsx` | `/exercises` |
| `patient-app/app/(tabs)/progress.tsx` | `/progress` |
| `patient-app/app/(tabs)/profile.tsx` | `/profile` |

### Status: ⏳ PENDENTE

---

## PROBLEMAS CONHECIDOS

| ID | Problema | Local | Status |
|----|----------|-------|--------|
| #001 | React Error #185 | Criação de agendamento | 🔍 Em investigação |
| #002 | asChild + onClick problemático | `AppointmentQuickView.tsx:307-324` | 🔍 Identificado |
| #003 | useEffect com dependências instáveis | `AppointmentModalRefactored.tsx:225-236` | 🔍 Identificado |

---

## PRÓXIMOS PASSOS

1. [ ] Testar fluxo de Agendamentos (prioridade - erro conhecido)
2. [ ] Testar fluxo de Pacientes
3. [ ] Testar fluxo de Evoluções
4. [ ] Testar fluxo de Avaliações
5. [ ] Testar outros CRUDs
6. [ ] Testar app do paciente
7. [ ] Compilar relatório final de correções
