# Design System — FisioFlow

> Stack: Tailwind CSS v4 + Shadcn/Radix UI + lucide-react v1 + Framer Motion  
> Fonte dos tokens: `src/index.css` (seção `@theme` + `@layer base`)  
> Variantes de componentes: `src/lib/ui-variants.ts`

---

## 1. Tokens de Cor

### Semânticos (HSL — referenciados como `hsl(var(--token))`)

| Token CSS | Light (H S% L%) | Dark (H S% L%) | Uso |
|---|---|---|---|
| `--background` | 210 20% 98% | 222.2 47.4% 7% | Fundo da página |
| `--foreground` | 224 71.4% 4.1% | 210 40% 98% | Texto principal |
| `--card` | 0 0% 100% | 222.2 47.4% 9% | Superfície de cards |
| `--card-foreground` | 224 71.4% 4.1% | 210 40% 98% | Texto em cards |
| `--popover` | 0 0% 100% | 222.2 47.4% 9% | Popovers e dropdowns |
| `--popover-foreground` | 224 71.4% 4.1% | 210 40% 98% | Texto em popovers |
| `--primary` | 211 100% 50% | 211 100% 50% | Ação principal (azul FisioFlow) |
| `--primary-foreground` | 210 20% 98% | 210 20% 98% | Texto sobre primary |
| `--secondary` | 220 14.3% 95.9% | 217.2 32.6% 17.5% | Ação secundária |
| `--secondary-foreground` | 220.9 39.3% 11% | 210 40% 98% | Texto sobre secondary |
| `--muted` | 220 14.3% 95.9% | 217.2 32.6% 17.5% | Elementos discretos |
| `--muted-foreground` | 220 8.9% 46.1% | 215 20.2% 65.1% | Texto placeholder/hint |
| `--accent` | 158 64% 52% | 158 64% 52% | Acento teal (verde clínico) |
| `--accent-foreground` | 220.9 39.3% 11% | 210 40% 98% | Texto sobre accent |
| `--destructive` | 0 84.2% 60.2% | 0 62.8% 30.6% | Erro / ação destrutiva |
| `--destructive-foreground` | 210 20% 98% | 210 40% 98% | Texto sobre destructive |
| `--border` | 220 13% 91% | 217.2 32.6% 17.5% | Bordas padrão |
| `--input` | 220 13% 91% | 217.2 32.6% 17.5% | Borda de inputs |
| `--ring` | 211 100% 50% | 211 100% 50% | Focus ring |

### Sidebar

| Token CSS | Light | Dark |
|---|---|---|
| `--sidebar-background` | 0 0% 100% | — |
| `--sidebar-foreground` | 222.2 47.4% 11.2% | — |
| `--sidebar-primary` | 210 90% 51% | — |
| `--sidebar-accent` | 220 13% 95% | — |
| `--sidebar-border` | 220 13% 91% | — |

### Domínio — Pain Map

| Token | Hex | Significado |
|---|---|---|
| `--color-pain-0` | `#9ca3af` | Sem dor |
| `--color-pain-1` | `#bef264` | Mínima |
| `--color-pain-3` | `#fde047` | Leve |
| `--color-pain-5` | `#fdba74` | Moderada |
| `--color-pain-7` | `#f87171` | Intensa |
| `--color-pain-10` | `#7f1d1d` | Insuportável |
| `--color-pain-gauge-low` | `#22c55e` | Faixa verde |
| `--color-pain-gauge-med` | `#eab308` | Faixa amarela |
| `--color-pain-gauge-high` | `#ef4444` | Faixa vermelha |
| `--color-pain-gauge-severe` | `#7f1d1d` | Faixa crítica |

### Domínio — Status de Agendamento

| Token | Hex | Estado |
|---|---|---|
| `--color-status-confirmed` | `#10b981` | Confirmado |
| `--color-status-pending` | `#f59e0b` | Pendente |
| `--color-status-cancelled` | `#ef4444` | Cancelado |
| `--color-status-completed` | `#3b82f6` | Realizado |

### Como usar as cores

```tsx
// ✅ Correto — tokens semânticos via Tailwind
<div className="bg-primary text-primary-foreground" />
<div className="bg-card border border-border" />

// ✅ Correto — tokens de domínio via CSS var
<div style={{ backgroundColor: "var(--color-status-confirmed)" }} />

// ❌ Errado — hardcoded hex sem semântica
<div className="bg-[#0080FF]" />
```

---

## 2. Tipografia

| Token | Valor | Uso |
|---|---|---|
| `--font-sans` | `"Noto Sans", Inter, ui-sans-serif` | Corpo de texto, labels, UI |
| `--font-display` | `"Figtree", Outfit, ui-sans-serif` | Headings (h1–h6) |

```tsx
// Headings usam font-display automaticamente via @layer base
<h1 className="text-2xl font-semibold" />     // Figtree
<p className="text-sm text-muted-foreground" /> // Noto Sans
```

---

## 3. Border Radius

| Token | Valor calculado | Uso |
|---|---|---|
| `--radius` | `1rem` (16px) | Base — padrão global |
| `--radius-lg` | `var(--radius)` → 16px | Cards, modais |
| `--radius-md` | `calc(var(--radius) - 2px)` → 14px | Inputs, selects |
| `--radius-sm` | `calc(var(--radius) - 4px)` → 12px | Badges, chips |

```tsx
<div className="rounded-lg" />  // 16px
<input className="rounded-md" />  // 14px
<span className="rounded-sm" />  // 12px
```

---

## 4. Breakpoints

| Token | px | Uso |
|---|---|---|
| `iphone` | 390px | iPhone padrão |
| `iphone-max` | 430px | iPhone Pro Max |
| `xs` | 480px | Extra small |
| `sm` | 640px | Tablet pequeno |
| `ipad` | 834px | iPad |
| `md` | 768px | Tablet |
| `ipad-pro` | 1024px | iPad Pro |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Desktop largo |
| `2xl` | 1536px | Ultra wide |

---

## 5. Glassmorphism (utilitários)

| Classe / Var | Valor | Uso |
|---|---|---|
| `.glass-panel` | `rgba(255,255,255,0.7)` + blur(12px) + border rgba(255,255,255,0.2) | Painéis principais |
| `.glass-card` | `rgba(255,255,255,0.4)` + blur(4px) | Cards hover |
| `.dark .glass-panel` | `rgba(15,23,42,0.7)` | Dark mode automático |

```tsx
<div className="glass-panel p-6">...</div>
```

---

## 6. Animações

| Token | Duração | Uso |
|---|---|---|
| `accordion-down/up` | 0.2s ease-out | Accordion Radix |
| `wiggle` | 0.5s ease-in-out | Gamificação, alertas |
| `pulse-ring` | 1.5s infinite | Indicadores live/online |
| `pulse-subtle` | 2s infinite | Loading states suaves |
| `stagger-in` | 0.4s ease-out | Entrada de listas |
| `bounce-subtle` | 2s ease-in-out infinite | CTAs |

```tsx
<div className="animate-pulse-subtle" />
```

---

## 7. Catálogo de Componentes

> Fonte: `src/components/ui/` | Variantes: `src/lib/ui-variants.ts`

---

### Button

**Arquivo:** `src/components/ui/button.tsx`  
**Props extras:** `magnetic`, `glow`, `premium`

| Variant | Uso |
|---|---|
| `default` | Ação primária (azul) |
| `destructive` | Exclusão, ação crítica |
| `outline` | Ação secundária com borda |
| `secondary` | Ação de baixa ênfase |
| `ghost` | Ação inline sem background |
| `link` | Navegação textual |
| `medical` | Fluxos clínicos (gradient) |
| `brand` | Marketing, onboarding |
| `success` | Confirmação, concluído |
| `warm` | Alertas positivos |
| `neon` | Gamificação, CTAs especiais |

| Size | px altura |
|---|---|
| `sm` | 36px |
| `default` | 40px |
| `lg` | 44px |
| `icon` | 40×40px |

**ARIA:** `disabled` nativo + `aria-busy` para loading states  
**Responsivo:** `size="sm"` em mobile, `size="default"` em desktop

```tsx
<Button variant="default" size="default">Salvar</Button>
<Button variant="destructive" size="sm">Excluir</Button>
<Button variant="ghost" size="icon"><Trash2 className="size-4" /></Button>
<Button variant="medical" glow>Iniciar Sessão</Button>
```

---

### Badge

**Arquivo:** `src/components/ui/badge.tsx`

| Variant | Uso |
|---|---|
| `default` | Status geral (primary bg) |
| `secondary` | Info de baixa ênfase |
| `destructive` | Erro, urgente |
| `outline` | Tag sem fill |

```tsx
<Badge variant="default">Ativo</Badge>
<Badge variant="destructive">Cancelado</Badge>
<Badge variant="outline">Fisioterapeuta</Badge>
```

---

### Card

**Arquivo:** `src/components/ui/card.tsx`  
**Sub-componentes:** `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

```tsx
<Card>
  <CardHeader>
    <CardTitle>Paciente</CardTitle>
    <CardDescription>Última sessão há 3 dias</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter className="gap-2">
    <Button size="sm">Ver prontuário</Button>
  </CardFooter>
</Card>
```

**Glassmorphism:** adicionar `.glass-panel` ou `.glass-card` ao `className`

---

### Input

**Arquivo:** `src/components/ui/input.tsx`  
**Variantes especializadas:** `password-input.tsx`, `phone-input.tsx`, `cpf-input.tsx`, `date-input-br.tsx`, `name-input.tsx`

**ARIA:** sempre emparelhar com `<Label htmlFor="id">` + `aria-describedby` para mensagens de erro  
**Estados:** default, focus (ring azul), disabled (opacity-50), error (borda vermelha via `Form` + `FormMessage`)

```tsx
<div className="space-y-1">
  <Label htmlFor="email">E-mail</Label>
  <Input id="email" type="email" placeholder="paciente@email.com" />
</div>
```

---

### Form (React Hook Form + Zod)

**Arquivo:** `src/components/ui/form.tsx`  
**Sub-componentes:** `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`

```tsx
<Form {...form}>
  <FormField
    control={form.control}
    name="cpf"
    render={({ field }) => (
      <FormItem>
        <FormLabel>CPF</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

---

### Dialog

**Arquivo:** `src/components/ui/dialog.tsx`  
**ARIA:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` automático via Radix

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirmar ação</DialogTitle>
      <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="destructive">Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### AlertDialog

**Arquivo:** `src/components/ui/alert-dialog.tsx`  
Usar para ações destrutivas (exclusão, cancelamento). `AlertDialogCancel` é o botão focado por padrão.

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Excluir paciente</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir?</AlertDialogTitle>
      <AlertDialogDescription>Dados serão removidos permanentemente.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### Select

**Arquivo:** `src/components/ui/select.tsx`  
**ARIA:** `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"` via Radix

```tsx
<Select onValueChange={setValue}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Selecione..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="fisio">Fisioterapeuta</SelectItem>
    <SelectItem value="estagiario">Estagiário</SelectItem>
  </SelectContent>
</Select>
```

---

### Tabs

**Arquivo:** `src/components/ui/tabs.tsx`  
**ARIA:** `role="tablist"`, `role="tab"`, `role="tabpanel"` via Radix

```tsx
<Tabs defaultValue="prontuario">
  <TabsList>
    <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
    <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
    <TabsTrigger value="escalas">Escalas</TabsTrigger>
  </TabsList>
  <TabsContent value="prontuario">...</TabsContent>
</Tabs>
```

---

### Accordion

**Arquivo:** `src/components/ui/accordion.tsx`  
Animação via `accordion-down/up` keyframes. `type="single"` ou `type="multiple"`.

```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="hx">
    <AccordionTrigger>Histórico Clínico</AccordionTrigger>
    <AccordionContent>...</AccordionContent>
  </AccordionItem>
</Accordion>
```

---

### Tooltip

**Arquivo:** `src/components/ui/tooltip.tsx`  
**ARIA:** `role="tooltip"` automático. Sempre usar `TooltipProvider` na raiz.

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon"><Info className="size-4" /></Button>
  </TooltipTrigger>
  <TooltipContent>Informação adicional</TooltipContent>
</Tooltip>
```

---

### Dropdown Menu

**Arquivo:** `src/components/ui/dropdown-menu.tsx`  
Usar para menus de contexto e ações de linha em tabelas.

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>Editar</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Sheet

**Arquivo:** `src/components/ui/sheet.tsx`  
Painel lateral (drawer) — preferir para formulários de edição em mobile.

```tsx
<Sheet>
  <SheetTrigger asChild><Button>Editar paciente</Button></SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Editar Paciente</SheetTitle>
    </SheetHeader>
    {/* form aqui */}
  </SheetContent>
</Sheet>
```

---

### Table / ResponsiveTable

**Arquivos:** `src/components/ui/table.tsx`, `src/components/ui/responsive-table.tsx`

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nome</TableHead>
      <TableHead>Data</TableHead>
      <TableHead className="text-right">Ações</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>João Silva</TableCell>
      <TableCell>2026-04-28</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>...</DropdownMenu>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

Em mobile use `<ResponsiveTable>` que colapsa para cards.

---

### Avatar

**Arquivo:** `src/components/ui/avatar.tsx`  
**ARIA:** `alt` obrigatório no `AvatarImage`. Fallback com iniciais.

```tsx
<Avatar>
  <AvatarImage src={user.avatar} alt={user.name} />
  <AvatarFallback>{user.initials}</AvatarFallback>
</Avatar>
```

---

### Skeleton

**Arquivo:** `src/components/ui/skeleton.tsx`  
Usar durante `isLoading` de queries TanStack. Nunca mostrar spinner global.

```tsx
{isLoading ? (
  <div className="space-y-2">
    <Skeleton className="h-4 w-[200px]" />
    <Skeleton className="h-4 w-[160px]" />
  </div>
) : <Content />}
```

---

### Progress

**Arquivo:** `src/components/ui/progress.tsx`  
**ARIA:** `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` via Radix.

```tsx
<Progress value={compliance} className="h-2" aria-label="Adesão ao protocolo" />
```

---

### Switch

**Arquivo:** `src/components/ui/switch.tsx`  
**ARIA:** `role="switch"`, `aria-checked` via Radix. Sempre emparelhar com `<Label>`.

```tsx
<div className="flex items-center gap-2">
  <Switch id="notif" checked={enabled} onCheckedChange={setEnabled} />
  <Label htmlFor="notif">Notificações por e-mail</Label>
</div>
```

---

### Checkbox

**Arquivo:** `src/components/ui/checkbox.tsx`

```tsx
<div className="flex items-center gap-2">
  <Checkbox id="aceito" checked={accepted} onCheckedChange={setAccepted} />
  <Label htmlFor="aceito">Aceito os termos de uso</Label>
</div>
```

---

### Textarea

**Arquivo:** `src/components/ui/textarea.tsx`  
**Variante inteligente:** `src/components/ui/SmartTextarea.tsx` (sugestões AI)

```tsx
<Textarea placeholder="Evolução clínica..." rows={4} className="resize-none" />
```

---

### Sonner (Toast)

**Arquivo:** `src/components/ui/sonner.tsx`  
Instanciar `<Toaster />` uma vez no `App.tsx`. Disparar via `toast()`.

```tsx
import { toast } from "sonner";
toast.success("Sessão salva com sucesso");
toast.error("Erro ao salvar");
toast.loading("Salvando...", { id: "save" });
toast.dismiss("save");
```

---

### Popover

**Arquivo:** `src/components/ui/popover.tsx`  
Usar para filtros, pickers e ações contextuais sem bloquear o fluxo.

```tsx
<Popover>
  <PopoverTrigger asChild><Button variant="outline">Filtros</Button></PopoverTrigger>
  <PopoverContent className="w-80">
    {/* filtros */}
  </PopoverContent>
</Popover>
```

---

### Calendar

**Arquivo:** `src/components/ui/calendar.tsx`  
Wrapper sobre `react-day-picker`. Emparelhar com `Popover` para date pickers.

```tsx
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  className="rounded-md border"
/>
```

---

### Command

**Arquivo:** `src/components/ui/command.tsx`  
Base para buscas com filtro. Usado internamente no `CommandPalette.tsx`.

```tsx
<Command>
  <CommandInput placeholder="Buscar paciente..." />
  <CommandList>
    <CommandEmpty>Nenhum resultado.</CommandEmpty>
    <CommandGroup heading="Recentes">
      <CommandItem onSelect={handleSelect}>João Silva</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

---

### Breadcrumb

**Arquivo:** `src/components/ui/breadcrumb.tsx`  
**ARIA:** `<nav aria-label="breadcrumb">` automático.

```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbPage>Pacientes</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

---

### Slider

**Arquivo:** `src/components/ui/slider.tsx`  
Usado na Escala de Dor (VAS 0–10). **ARIA:** `role="slider"`, `aria-valuenow` via Radix.

```tsx
<Slider
  min={0}
  max={10}
  step={1}
  value={[painLevel]}
  onValueChange={([v]) => setPainLevel(v)}
  aria-label="Intensidade da dor"
/>
```

---

## 8. Padrões de Composição

### Empty States

Usar `src/components/ui/empty-state.tsx` (base) ou `EmptyStateEnhanced.tsx` (com ação).

```tsx
<EmptyState
  icon={<Users className="size-8 text-muted-foreground" />}
  title="Nenhum paciente"
  description="Adicione o primeiro paciente para começar."
  action={<Button>Adicionar paciente</Button>}
/>
```

### Loading

```tsx
// ✅ Skeleton por seção (preferido)
<Skeleton className="h-[120px] w-full rounded-lg" />

// ✅ AppLoadingSkeleton para transições de rota
<AppLoadingSkeleton />

// ❌ Spinner global bloqueante — evitar
```

### Formulários

- Sempre usar `Form` + `FormField` + `FormMessage` (React Hook Form)
- Validação via Zod — nunca validação manual ad hoc
- `disabled={isSubmitting}` no botão submit
- Toast de sucesso/erro após mutação (`toast.success` / `toast.error`)

---

## 9. Acessibilidade

| Regra | Como aplicar |
|---|---|
| Contraste mínimo 4.5:1 | Usar tokens semânticos (não hardcoded) |
| Focus ring visível | `focus-visible:ring-2 focus-visible:ring-ring` (padrão nos componentes) |
| Labels em todos os inputs | `<Label htmlFor="id">` + `id` no input |
| Imagens | `alt` descritivo ou `alt=""` + `aria-hidden="true"` em decorativas |
| Botões icon-only | `aria-label` explícito |
| Modais | Radix gerencia `aria-modal`, `role="dialog"`, foco ao abrir/fechar |
| Skip link | `src/components/ui/accessibility/SkipLinks.tsx` no layout raiz |

---

## 10. Governança e Versionamento

### Quando atualizar este documento

- Novo token adicionado a `src/index.css`
- Nova variante em `src/lib/ui-variants.ts`
- Novo componente em `src/components/ui/`
- Mudança de cor, fonte ou radius global

### Convenção de versionamento de componentes

Componentes Shadcn são tratados como **locked base** — não modificar os arquivos diretamente se possível.  
Extensões ficam em arquivos separados com sufixo descritivo:

```
button.tsx              ← base Shadcn (não modificar a estrutura Radix)
ui-variants.ts          ← variantes CVA centralizadas (modificar aqui)
SmartTextarea.tsx       ← extensão com lógica AI (não prefixar com "Enhanced")
ResponsiveTable.tsx     ← wrapper responsivo sobre Table base
```

### Checklist de revisão DS em PRs

O template `.github/PULL_REQUEST_TEMPLATE.md` já inclui:

```
[ ] Tokens semânticos usados (sem hex hardcoded)
[ ] Dark mode testado manualmente
[ ] Acessibilidade: labels, ARIA, foco verificados
[ ] Responsividade: mobile e desktop testados
[ ] Componente novo adicionado ao catálogo em DESIGN_SYSTEM.md
```

### Não fazer

- Hardcoded hex sem token (`bg-[#0080FF]` → usar `bg-primary`)
- Criar novo componente sem verificar se existe em `src/components/ui/`
- Usar `z-index` arbitrário — preferir classes Tailwind (`z-10`, `z-50`)
- Classes de animação fora das definidas em `@theme` (exceto Framer Motion)
