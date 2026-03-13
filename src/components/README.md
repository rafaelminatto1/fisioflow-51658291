# FisioFlow Components

Este diretório contém todos os componentes React do FisioFlow.

## Estrutura

```
src/components/
├── index.ts                    # Barrel export de componentes compartilhados
├── README.md                   # Esta documentação
│
├── ui/                         # Componentes de UI base (shadcn/ui)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   └── ...
│
├── schedule/                   # Componentes da Agenda ⭐
│   ├── index.ts
│   ├── README.md
│   ├── CalendarView.tsx
│   ├── AppointmentCard.tsx
│   └── ...
│
├── patients/                   # Componentes de Pacientes
├── clinical/                   # Componentes Clínicos
├── financial/                  # Componentes Financeiros
├── dashboard/                  # Componentes de Dashboard
├── reports/                    # Componentes de Relatórios
├── settings/                   # Componentes de Configurações
│
├── layout/                     # Layout components
│   ├── MainLayout.tsx
│   ├── Sidebar.tsx
│   └── Header.tsx
│
├── forms/                      # Formulários reutilizáveis
├── modals/                     # Modais
├── common/                     # Componentes comuns
│
└── [feature components]        # Componentes de features específicas
```

## Domínios Principais

### 📅 schedule/
Componentes da agenda - a área mais utilizada do sistema.

**Subdiretórios:**
- `settings/` - Configurações da agenda
- `shared/` - Utilitários compartilhados
- `skeletons/` - Loading states
- `virtualization/` - Componentes virtualizados

**Componentes principais:**
- `CalendarView` - Visualização principal
- `AppointmentCard` - Card de agendamento
- `AppointmentModal` - Modal de criação/edição
- `QuickFilters` - Filtros rápidos

[Ver documentação completa →](./schedule/README.md)

### 👤 patients/
Componentes relacionados a pacientes.

- Ficha de paciente
- Histórico de evoluções
- Documentos
- Mapas de dor

### 💰 financial/
Componentes financeiros.

- Contas a pagar/receber
- Fluxo de caixa
- Relatórios financeiros
- Recibos

### 📊 reports/
Componentes de relatórios.

- Gerador de relatórios
- Gráficos
- Exportações

### 🎨 ui/
Componentes base de UI (shadcn/ui).

- Button, Dialog, Form, Table, etc.
- Usados em todo o sistema
- Customizações do tema

## Como Usar

### Importação

```typescript
// ✅ Recomendado: importar de subdiretório
import { CalendarView, AppointmentCard } from '@/components/schedule';
import { Button, Dialog } from '@/components/ui';

// ✅ Aceitável: importar do barrel principal
import { Button } from '@/components';

// ❌ Evitar: importar diretamente
import { CalendarView } from '@/components/schedule/CalendarView';
```

### Exemplo de Componente

```typescript
/**
 * MyComponent - Descrição breve
 * 
 * @description Descrição detalhada se necessário
 * @example
 * <MyComponent title="Hello" onAction={handleAction} />
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  /** Título do componente */
  title: string;
  /** Callback de ação */
  onAction?: () => void;
  /** Classes adicionais */
  className?: string;
}

export function MyComponent({ title, onAction, className }: MyComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <h2>{title}</h2>
      <Button onClick={onAction}>Ação</Button>
    </div>
  );
}
```

## Convenções

### Nomenclatura

- **Componentes**: PascalCase (ex: `AppointmentCard`)
- **Arquivos**: PascalCase (ex: `AppointmentCard.tsx`)
- **Utilitários**: camelCase (ex: `formatDate.ts`)

### Estrutura de Arquivo

```
ComponentName/
├── ComponentName.tsx       # Componente principal
├── ComponentName.test.tsx  # Testes (opcional)
├── index.ts               # Barrel export
└── types.ts               # Tipos específicos (se necessário)
```

### Props

```typescript
interface ComponentProps {
  // ✅ Obrigatórios primeiro
  id: string;
  name: string;
  
  // ✅ Opcionais depois
  className?: string;
  disabled?: boolean;
  
  // ✅ Callbacks por último
  onClick?: () => void;
  onChange?: (value: string) => void;
}
```

## Padrões

### Composition Pattern

```typescript
// Componente com subcomponentes
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

### Render Props

```typescript
<DataFetcher
  queryKey={['data']}
  queryFn={fetchData}
  renderLoading={() => <Skeleton />}
  renderError={(error) => <Error error={error} />}
  renderSuccess={(data) => <DataList data={data} />}
/>
```

### Custom Hooks

```typescript
// Lógica complexa deve ser extraída para hooks
function AppointmentList() {
  const { appointments, isLoading, error } = useAppointments();
  // ...
}
```

## Manutenção

### Adicionando Novo Componente

1. **Identifique o domínio**: schedule, patients, financial, ui, etc.
2. **Crie o arquivo** no diretório apropriado
3. **Adicione export** no `index.ts` do domínio
4. **Documente** com JSDoc
5. **Crie testes** se necessário

### Componentes Grandes

Para componentes complexos, crie um diretório:

```
FeatureComponent/
├── index.ts
├── FeatureComponent.tsx
├── FeatureComponent.test.tsx
├── components/
│   ├── SubComponent1.tsx
│   └── SubComponent2.tsx
├── hooks/
│   └── useFeatureLogic.ts
└── types.ts
```

### Depreciação

```typescript
/**
 * @deprecated Use NewComponent em vez deste
 * @see NewComponent
 */
export function OldComponent(props: OldProps) {
  return <NewComponent {...props} />;
}
```

## Componentes UI (shadcn/ui)

O projeto usa shadcn/ui como base. Os componentes estão em `src/components/ui/`.

### Adicionando Novo Componente UI

```bash
npx shadcn-ui@latest add component-name
```

### Customizando Tema

Edite `src/styles/globals.css` para variáveis CSS do tema.

## Performance

### Lazy Loading

```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function Parent() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Memoização

```typescript
// Use memo para componentes que re-renderizam frequentemente
export const ExpensiveComponent = memo(function ExpensiveComponent({ data }: Props) {
  // ...
});

// Use useMemo para cálculos pesados
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

// Use useCallback para callbacks passados como props
const handleClick = useCallback((id: string) => {
  setSelected(id);
}, []);
```

## Veja Também

- [Hooks](../hooks/README.md)
- [Tipos](../types/README.md)
- [Lib](../lib/README.md)
- [shadcn/ui Documentation](https://ui.shadcn.com/)