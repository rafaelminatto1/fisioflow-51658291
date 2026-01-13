# Referência: Componentes Reutilizáveis

## Componentes Base (shadcn/ui)

### Button

```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Salvar</Button>
<Button variant="destructive">Excluir</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="ghost">Fechar</Button>
<Button variant="link">Saiba mais</Button>
<Button size="sm">Pequeno</Button>
<Button size="lg">Grande</Button>
<Button size="icon"><Icon /></Button>
<Button disabled>Desabilitado</Button>
```

### Input

```tsx
import { Input } from '@/components/ui/input';

<Input placeholder="Nome" />
<Input type="email" placeholder="email@exemplo.com" />
<Input type="password" placeholder="Senha" />
<Input type="date" />
<Input type="number" placeholder="123" />
<Input disabled value="Bloqueado" />
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Conteúdo do card
  </CardContent>
  <CardFooter>
    <Button>Ação</Button>
  </CardFooter>
</Card>
```

### Dialog

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirmar</DialogTitle>
    </DialogHeader>
    <p>Deseja continuar?</p>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      <Button>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Select

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Opção 1</SelectItem>
    <SelectItem value="2">Opção 2</SelectItem>
  </SelectContent>
</Select>
```

### Table

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nome</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {patients.map(patient => (
      <TableRow key={patient.id}>
        <TableCell>{patient.name}</TableCell>
        <TableCell>{patient.email}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## Componentes de Domínio

### PatientCard

```tsx
import { PatientCard } from '@/components/patients/PatientCard';

<PatientCard
  patient={patient}
  onClick={() => navigate(`/patients/${patient.id}`)}
/>
```

### AppointmentCalendar

```tsx
import { AppointmentCalendar } from '@/components/schedule/AppointmentCalendar';

<AppointmentCalendar
  view="week"
  date={new Date()}
  onEventClick={(appointment) => console.log(appointment)}
  onDateClick={(date) => console.log(date)}
/>
```

### ExerciseCard

```tsx
import { ExerciseCard } from '@/components/exercises/ExerciseCard';

<ExerciseCard
  exercise={exercise}
  onSelect={() => addToPrescription(exercise)}
  showVideo
/>
```

## Componentes de Layout

### MainLayout

```tsx
import { MainLayout } from '@/components/layout/MainLayout';

<MainLayout>
  <PageContent />
</MainLayout>
```

### Sidebar

```tsx
import { Sidebar } from '@/components/layout/Sidebar';

<Sidebar
  navigation={[
    { name: 'Agenda', href: '/schedule', icon: Calendar },
    { name: 'Pacientes', href: '/patients', icon: Users },
  ]}
/>
```

## Componentes Utilitários

### LoadingSkeleton

```tsx
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

<LoadingSkeleton type="card" rows={3} />
<LoadingSkeleton type="table" rows={10} />
<LoadingSkeleton type="list" rows={5} />
<LoadingSkeleton type="form" />
```

### EmptyState

```tsx
import { EmptyState } from '@/components/ui/empty-state';

<EmptyState
  icon={Users}
  title="Nenhum paciente encontrado"
  description="Comece cadastrando um novo paciente"
  action={{ label: 'Novo Paciente', onClick: () => setOpen(true) }}
/>
```

### StatusBadge

```tsx
import { StatusBadge } from '@/components/ui/status-badge';

<StatusBadge status="scheduled" />  // Azul
<StatusBadge status="confirmed" />  // Verde
<StatusBadge status="cancelled" />  // Vermelho
```

## Veja Também

- [Componentes UI](../08-componentes-ui.md) - Design System completo
- [Estrutura do Projeto](../04-estrutura-projeto.md) - Organização
