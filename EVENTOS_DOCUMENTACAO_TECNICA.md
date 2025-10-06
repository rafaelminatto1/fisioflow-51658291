# Sistema de Eventos - Documentação Técnica

## Arquitetura

### Stack Tecnológica
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **State Management:** @tanstack/react-query
- **Validação:** Zod
- **Forms:** React Hook Form
- **Backend:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth

## Estrutura de Dados

### Tabelas do Banco de Dados

#### eventos
```sql
CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL, -- corrida | corporativo | ativacao | outro
  local TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'AGENDADO', -- AGENDADO | EM_ANDAMENTO | CONCLUIDO | CANCELADO
  gratuito BOOLEAN NOT NULL DEFAULT false,
  link_whatsapp TEXT,
  valor_padrao_prestador NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### prestadores
```sql
CREATE TABLE public.prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  contato TEXT,
  cpf_cnpj TEXT,
  valor_acordado NUMERIC NOT NULL DEFAULT 0,
  status_pagamento TEXT NOT NULL DEFAULT 'PENDENTE', -- PENDENTE | PAGO
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### checklist_items
```sql
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL, -- levar | alugar | comprar
  quantidade INTEGER NOT NULL DEFAULT 1,
  custo_unitario NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ABERTO', -- ABERTO | OK
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### participantes
```sql
CREATE TABLE public.participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  contato TEXT,
  instagram TEXT,
  segue_perfil BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### pagamentos
```sql
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- prestador | insumo | outro
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  pago_em DATE NOT NULL,
  comprovante_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Row Level Security (RLS)

### Políticas de Segurança

```sql
-- Eventos: Admin e Fisio podem gerenciar
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e fisio podem ver eventos"
  ON eventos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'fisioterapeuta')
    )
  );

CREATE POLICY "Admin e fisio podem criar eventos"
  ON eventos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'fisioterapeuta')
    )
  );

CREATE POLICY "Admin e fisio podem atualizar eventos"
  ON eventos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'fisioterapeuta')
    )
  );

CREATE POLICY "Apenas admin pode deletar eventos"
  ON eventos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Prestadores: seguem permissões de eventos
-- Checklist, Participantes, Pagamentos: mesma lógica
```

## Estrutura de Código

### Hooks Customizados

#### useEventos
```typescript
// Buscar eventos com filtros
const { data: eventos } = useEventos({
  status: 'AGENDADO',
  categoria: 'corrida',
  busca: 'termo'
});

// Buscar evento específico
const { data: evento } = useEvento(id);

// Criar evento
const createEvento = useCreateEvento();
await createEvento.mutateAsync(data);

// Atualizar evento
const updateEvento = useUpdateEvento();
await updateEvento.mutateAsync({ id, data });

// Deletar evento
const deleteEvento = useDeleteEvento();
await deleteEvento.mutateAsync(id);
```

#### usePrestadores
```typescript
const { data: prestadores } = usePrestadores(eventoId);
const createPrestador = useCreatePrestador();
const updatePrestador = useUpdatePrestador();
const deletePrestador = useDeletePrestador();
const marcarPagamento = useMarcarPagamento();
const exportPrestadores = useExportPrestadores();
```

### Validação com Zod

```typescript
// src/lib/validations/evento.ts
export const eventoCreateSchema = z.object({
  nome: z.string().min(2).max(100),
  descricao: z.string().optional(),
  categoria: z.enum(['corrida', 'corporativo', 'ativacao', 'outro']),
  local: z.string().min(2),
  data_inicio: z.date(),
  data_fim: z.date(),
  gratuito: z.boolean().default(false),
  link_whatsapp: z.string().url().optional().or(z.literal('')),
  valor_padrao_prestador: z.number().nonnegative().default(0),
});
```

## Componentes Principais

### Páginas
- `src/pages/Eventos.tsx` - Lista de eventos com filtros
- `src/pages/EventoDetalhes.tsx` - Detalhes com tabs

### Componentes
- `src/components/eventos/NewEventoModal.tsx` - Criação
- `src/components/eventos/EditEventoModal.tsx` - Edição
- `src/components/eventos/PrestadoresTab.tsx` - Gestão de prestadores
- `src/components/eventos/ChecklistTab.tsx` - Checklist
- `src/components/eventos/ParticipantesTab.tsx` - Participantes
- `src/components/eventos/FinanceiroTab.tsx` - Dashboard financeiro
- `src/components/eventos/EventosStatsWidget.tsx` - Estatísticas

### Hooks
- `src/hooks/useEventos.ts` - CRUD de eventos
- `src/hooks/usePrestadores.ts` - CRUD de prestadores
- `src/hooks/useChecklist.ts` - CRUD de checklist
- `src/hooks/useParticipantes.ts` - CRUD de participantes
- `src/hooks/usePagamentos.ts` - CRUD de pagamentos
- `src/hooks/useEventosStats.ts` - Estatísticas agregadas

### Validações
- `src/lib/validations/evento.ts`
- `src/lib/validations/prestador.ts`
- `src/lib/validations/checklist.ts`
- `src/lib/validations/participante.ts`
- `src/lib/validations/pagamento.ts`

## Fluxo de Dados

1. **Usuário interage com UI** → React Component
2. **Component chama hook** → React Query Hook
3. **Hook valida dados** → Zod Schema
4. **Hook faz request** → Supabase Client
5. **Supabase valida RLS** → PostgreSQL
6. **Dados retornam** → React Query Cache
7. **UI atualiza** → Re-render otimizado

## Performance

### Otimizações Implementadas
- Lazy loading de páginas
- React Query cache (5min stale time)
- Debounce em buscas (300ms)
- Invalidação seletiva de queries
- Paginação onde necessário

### Métricas
- Time to Interactive: < 3s
- First Contentful Paint: < 1.5s
- Cache hit rate: > 80%

## Testes

### Estrutura de Testes
```
src/
  __tests__/
    hooks/
      useEventos.test.ts
      usePrestadores.test.ts
    components/
      EventosList.test.tsx
      EventoDetalhes.test.tsx
```

### Executar Testes
```bash
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:coverage # Coverage report
```

## Deploy e CI/CD

### Ambiente de Desenvolvimento
```bash
npm run dev
```

### Build de Produção
```bash
npm run build
npm run preview
```

### Variáveis de Ambiente
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Troubleshooting

### Problemas Comuns

**Erro: "Cannot read properties of null"**
- Verificar se TooltipProvider está configurado
- Confirmar contextos React corretamente aninhados

**Eventos não aparecem**
- Verificar RLS policies no Supabase
- Confirmar que usuário tem role adequado
- Checar logs do navegador

**Performance lenta**
- Verificar cache do React Query
- Analisar quantidade de re-renders
- Otimizar queries do Supabase

## Próximas Implementações

- [ ] Busca global avançada
- [ ] Notificações em tempo real
- [ ] Integração com calendário externo
- [ ] Relatórios em PDF
- [ ] Dashboard de analytics avançado
- [ ] Sistema de templates de eventos
- [ ] Integração com WhatsApp API

## Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Suporte

Para suporte técnico:
- Email: suporte@fisioflow.com
- Documentação: https://docs.fisioflow.com
- Issues: https://github.com/fisioflow/issues

---

**Versão:** 1.0.0  
**Última atualização:** 2025-10-06
