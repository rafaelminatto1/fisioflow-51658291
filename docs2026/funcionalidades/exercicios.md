# Funcionalidade: Biblioteca de Exercícios

## Visão Geral

Biblioteca completa de exercícios fisioterapêuticos com mais de 500 exercícios, vídeos demonstrativos e sistema de prescrição.

## Recursos

- ✅ Biblioteca com 500+ exercícios
- ✅ Vídeos demonstrativos
- ✅ Categorização por grupo muscular
- ✅ Níveis de dificuldade
- ✅ Prescrição personalizada
- ✅ Acompanhamento de execução
- ✅ Protocolos baseados em evidências

## Categorias

- Força (strength)
- Flexibilidade (flexibility)
- Equilíbrio (balance)
- Cardio (cardio)
- Mobilidade (mobility)
- Postura (posture)

## Dificuldade

- Beginner (iniciante)
- Intermediate (intermediário)
- Advanced (avançado)

## Prescrição

- ✅ Seleção de exercícios
- ✅ Configuração de séries e repetições
- ✅ Tempo de descanso
- ✅ Frequência semanal
- ✅ Orientações especiais
- ✅ Vídeos para o paciente

## Páginas

- `/exercises` - Biblioteca de exercícios
- `/exercises/:id` - Detalhes do exercício
- `/prescriptions` - Prescrições

## Componentes

- `ExerciseCard` - Card de exercício
- `ExerciseList` - Lista de exercícios
- `ExerciseFilter` - Filtros de busca
- `PrescriptionForm` - Formulário de prescrição

## API

```typescript
// GET /exercises
const { data } = await supabase
  .from('exercises')
  .select('*')
  .eq('category', category)
  .eq('difficulty', difficulty);

// POST /prescriptions
const { data } = await supabase.from('prescriptions').insert({
  patient_id,
  exercises: [
    { exercise_id, sets: 3, reps: 12, rest_seconds: 60 }
  ],
});

// GET /prescriptions/:id/logs
const { data } = await supabase
  .from('prescription_logs')
  .select('*')
  .eq('prescription_id', id);
```

## Veja Também

- [Prontuário](./prontuario.md) - Evoluções SOAP
- [IA](../../13-roadmap.md) - Prescrição com IA (planejado)
