# 08. Componentes UI e Design System

## 🎨 Visão Geral

O FisioFlow utiliza **shadcn/ui** como base para seu Design System, combinando componentes do **Radix UI** com estilização **Tailwind CSS**.

## 🧩 Estrutura do Design System

```
src/components/
├── ui/                          # Componentes base (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── select.tsx
│   ├── checkbox.tsx
│   ├── radio-group.tsx
│   ├── switch.tsx
│   ├── slider.tsx
│   ├── tabs.tsx
│   ├── toast.tsx
│   ├── table.tsx
│   └── index.ts
│
├── layout/                      # Layout components
│   ├── MainLayout.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── MobileNav.tsx
│
└── [domain]/                    # Componentes de domínio
    ├── patients/
    ├── schedule/
    ├── exercises/
    └── ...
```

## 🎯 Componentes Base (shadcn/ui)

### Button

```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// Uso
<Button variant="default">Salvar</Button>
<Button variant="destructive">Excluir</Button>
<Button variant="outline" size="sm">Cancelar</Button>
<Button variant="ghost" size="icon"><Icon /></Button>
```

### Input

```typescript
// components/ui/input.tsx
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

// Uso
<Input type="text" placeholder="Nome do paciente" />
<Input type="email" placeholder="email@exemplo.com" />
<Input type="date" />
```

### Card

```typescript
// components/ui/card.tsx
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
);

const CardHeader: React.FC<CardHeaderProps> = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
);

const CardTitle: React.FC<CardTitleProps> = ({ className, ...props }) => (
  <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
);

const CardContent: React.FC<CardContentProps> = ({ className, ...props }) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

// Uso
<Card>
  <CardHeader>
    <CardTitle>Paciente</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Informações do paciente...</p>
  </CardContent>
</Card>
```

### Dialog

```typescript
// components/ui/dialog.tsx (Radix UI)
export function Dialog({ open, onOpenChange, children }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/50" />
        <RadixDialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// Uso
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirmar ação</DialogTitle>
    </DialogHeader>
    <p>Deseja realmente excluir este item?</p>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      <Button variant="destructive">Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Select

```typescript
// components/ui/select.tsx (Radix UI Select)
// Uso
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione uma opção" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="esportiva">Avaliação Esportiva</SelectItem>
    <SelectItem value="ortopedica">Avaliação Ortopédica</SelectItem>
    <SelectItem value="neurologica">Avaliação Neurológica</SelectItem>
  </SelectContent>
</Select>
```

## 🎨 Sistema de Cores

### Paleta de Cores (Tailwind)

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },

        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },

        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },

        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },

        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },

        // Cores específicas para fisioterapia
        pain: {
          0: '#4ade80',   // Verde (sem dor)
          2: '#a3e635',
          4: '#facc15',
          6: '#fb923c',
          8: '#f87171',
          10: '#ef4444',  // Vermelho (dor intensa)
        },

        appointment: {
          scheduled: '#3b82f6',
          confirmed: '#22c55e',
          in_progress: '#f59e0b',
          completed: '#6b7280',
          cancelled: '#ef4444',
          no_show: '#a855f7',
        },
      },
    },
  },
};
```

### CSS Variables

```css
/* src/index.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --primary: 210 100% 50%; /* Azul FisioFlow */
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 96%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 210 100% 50%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --primary: 210 100% 50%;
    --primary-foreground: 222.2 47.4% 11.2%;

    /* ... */
  }
}
```

## 📐 Componentes de Layout

### MainLayout

```typescript
// components/layout/MainLayout.tsx
export function MainLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn(
        'transition-all duration-300',
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      )}>
        <Header />
        <main className="container py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Sidebar

```typescript
// components/layout/Sidebar.tsx
export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const location = useLocation();

  const navigation = [
    { name: 'Agenda', href: '/schedule', icon: Calendar },
    { name: 'Pacientes', href: '/patients', icon: Users },
    { name: 'Prontuário', href: '/medical-record', icon: FileText },
    { name: 'Exercícios', href: '/exercises', icon: Dumbbell },
    { name: 'Financeiro', href: '/financial', icon: DollarSign },
    { name: 'Relatórios', href: '/reports', icon: BarChart3 },
  ];

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-40 h-screen bg-card border-r transition-transform',
      sidebarOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0'
    )}>
      <div className="flex h-16 items-center justify-center border-b">
        {sidebarOpen ? <Logo /> : <LogoIcon />}
      </div>
      <nav className="space-y-1 p-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {sidebarOpen && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

## 🎭 Componentes de Domínio

### PatientCard

```typescript
// components/patients/PatientCard.tsx
interface PatientCardProps {
  patient: Patient;
  onClick?: () => void;
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{patient.full_name}</CardTitle>
          <Badge variant={patient.active ? 'default' : 'secondary'}>
            {patient.active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          {patient.email && <p><Mail className="inline w-4 h-4 mr-2" />{patient.email}</p>}
          {patient.phone && <p><Phone className="inline w-4 h-4 mr-2" />{patient.phone}</p>}
          {patient.date_of_birth && (
            <p><Calendar className="inline w-4 h-4 mr-2" />
              {calculateAge(patient.date_of_birth)} anos
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

## 📱 Responsividade

### Breakpoints

```javascript
// tailwind.config.js
export default {
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
};
```

### Padrões Responsivos

```tsx
// Grid responsivo
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>{item.name}</Card>)}
</div>

// Stack em mobile, side-by-side em desktop
<div className="flex flex-col sm:flex-row gap-4">
  <Input placeholder="Nome" />
  <Input placeholder="Email" />
</div>

// Elementos ocultos/exibidos
<div className="block md:hidden">Mobile apenas</div>
<div className="hidden md:block">Desktop apenas</div>
```

## 🔗 Recursos Relacionados

- [Estrutura do Projeto](./04-estrutura-projeto.md) - Organização de componentes
- [Componentes Reutilizáveis](./referencias/componentes-reutilizaveis.md) - Catálogo completo
- [Referências Técnicas](./referencias/) - Mais referências
