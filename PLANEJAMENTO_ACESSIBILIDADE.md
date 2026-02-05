# Planejamento de Correção - Acessibilidade FisioFlow

**Data:** 05 de Fevereiro de 2026
**Status:** Pendente de Implementação
**Total de Issues:** 21 (4 ARIA Labels + 17 Contraste)

---

## Resumo Executivo

| Categoria | Issues | Prioridade | Esforço Estimado |
|-----------|--------|------------|------------------|
| ARIA Labels | 4 | Alta | 2-3 horas |
| Contraste de Cores | 17 | Média | 4-6 horas |
| **TOTAL** | **21** | | **6-9 horas** |

---

## PARTE 1: ARIA Labels (4 issues)

### Impacto
Usuários de leitores de tela não conseguem identificar a função de 4 botões na interface.

### Arquivos a Modificar

#### 1. `/src/components/ui/button.tsx` (se existir)
**Problema:** Botões sem `aria-label` quando usados apenas com ícones

**Solução:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  // ... outras props
  ariaLabel?: string; // Adicionar prop específica
}

// No componente:
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ariaLabel, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
```

#### 2. `/src/components/schedule/CalendarDayColumn.tsx`
**Problema:** Botões de navegação sem labels

**Solução:**
```tsx
// Adicionar aria-label aos botões de ação
<button
  aria-label="Novo agendamento"
  onClick={handleNewAppointment}
>
  <Plus className="h-4 w-4" />
</button>

<button
  aria-label="Ver detalhes do dia"
  onClick={handleViewDay}
>
  <Calendar className="h-4 w-4" />
</button>
```

#### 3. `/src/components/schedule/TimeSlotCell.tsx`
**Problema:** Células de horário sem descrição

**Solução:**
```tsx
<button
  aria-label={`Horário ${timeSlot} - ${appointment ? 'ocupado' : 'disponível'}`}
  onClick={handleClick}
>
  {/* conteúdo */}
</button>
```

#### 4. Componentes de Ícone Genéricos
**Localização:** `/src/components/ui/` ou `/src/components/shared/`

**Solução:** Criar wrapper para ícones com aria-label:

```tsx
// /src/components/ui/Icon.tsx
interface IconProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className?: string;
}

export function Icon({ icon: IconComponent, label, className }: IconProps) {
  return (
    <span role="img" aria-label={label}>
      <IconComponent className={className} />
    </span>
  );
}

// Uso:
<Icon icon={Settings} label="Configurações" className="h-5 w-5" />
```

### Checklist de Implementação ARIA Labels

- [ ] Verificar todos os botões que contêm apenas ícones
- [ ] Adicionar `aria-label` descritivo a cada botão
- [ ] Testar com leitor de tela (NVDA/VoiceOver)
- [ ] Garantir que labels sejam específicos (ex: "Editar paciente João" em vez de "Editar")

---

## PARTE 2: Contraste de Cores (17 issues)

### Padrão WCAG AA
- **Texto normal (< 18px):** Contraste mínimo de 4.5:1
- **Texto grande (≥ 18px ou bold ≥ 14px):** Contraste mínimo de 3:1

### Issues Identificadas

#### 1. Texto "GMT-3" - Contraste 2.45:1 ❌
**Localização:** Componente de calendário/dashboard

**Cores atuais:**
- Texto: `#9CA3AF` (gray-400)
- Fundo: `#FFFFFF` ou `#F9FAFB`

**Solução:**
```css
/* Alterar para */
.timezone-label {
  color: #4B5563; /* gray-600 - contraste ~7:1 */
}

/* Ou para mais escuro se necessário */
.timezone-label {
  color: #374151; /* gray-700 - contraste ~11:1 */
}
```

#### 2. Horários do Calendário (07:00-20:00) - Contraste 4.76:1 ⚠️
**Localização:** `/src/components/schedule/CalendarDayColumn.tsx`

**Cores atuais:**
- Texto: `#9CA3AF` (gray-400)
- Fundo: claro

**Solução:**
```tsx
// Substituir:
<text className="text-gray-400">{time}</text>

// Por:
<text className="text-gray-600">{time}</text>
// ou
<text className="text-gray-700">{time}</text>
```

#### 3. Textos Pequenos em Geral
**Localização:** Múltiplos componentes

**Padrão de correção:**
```css
/* Antes */
.small-text {
  color: #9CA3AF; /* gray-400 */
}

/* Depois */
.small-text {
  color: #6B7280; /* gray-500 - contraste ~5.6:1 */
}
```

### Mapeamento de Cores Tailwind para WCAG AA

| Cor Atual | Contrate | Substituição | Novo Contraste |
|-----------|----------|--------------|----------------|
| `gray-400` (#9CA3AF) | 2.45:1 ❌ | `gray-600` (#4B5563) | 7:1 ✅ |
| `gray-300` (#D1D5DB) | 1.61:1 ❌ | `gray-500` (#6B7280) | 5.6:1 ✅ |
| `slate-400` (#94A3B8) | 2.93:1 ❌ | `slate-600` (#475569) | 6.9:1 ✅ |
| `zinc-400` (#A1A1AA) | 2.63:1 ❌ | `zinc-600` (#52525B) | 7.3:1 ✅ |

### Arquivos a Modificar para Contraste

#### 1. `/src/components/schedule/CalendarDayColumn.tsx`
```tsx
// Horários
-className="text-gray-400"
+className="text-gray-600"

// Labels de dia
-className="text-gray-300"
+className="text-gray-500"
```

#### 2. `/src/components/schedule/TimeSlotCell.tsx`
```tsx
// Texto de horário disponível
-className="text-gray-400"
+className="text-gray-600"

// Texto secundário
-className="text-slate-400"
+className="text-slate-600"
```

#### 3. `/src/components/ui/OptimizedImage.tsx`
```tsx
// Labels de imagem (se aplicável)
-className="text-zinc-400"
+className="text-zinc-600"
```

#### 4. `/src/pages/Dashboard.tsx` (ou similar)
```tsx
// Estatísticas e labels
-className="text-gray-400"
+className="text-gray-600"
```

### Ferramenta de Validação

Usar ferramentas como:
1. **Chrome DevTools Lighthouse** - Audit de acessibilidade
2. **axe DevTools** - Extensão do Chrome
3. **WAVE** - chrome://extensions/

---

## Ordem de Implementação Sugerida

### FASE 1: ARIA Labels (Prioridade Alta)
1. Mapear todos os botões sem labels
2. Implementar prop `ariaLabel` nos componentes de botão
3. Adicionar labels aos botões existentes
4. Testar com leitor de tela

### FASE 2: Contraste (Prioridade Média)
1. Criar variável CSS para cores de texto com contraste adequado
2. Substituir `gray-400` por `gray-600` em textos pequenos
3. Substituir `gray-300` por `gray-500` em labels
4. Validar com ferramenta de contraste

---

## Validação Final

### Checklist de Testes

#### ARIA Labels
- [ ] Todos os botões têm aria-label ou texto visível
- [ ] Leitor de tela consegue navegar por teclado
- [ ] Botões com ícones têm labels descritivos
- [ ] Imagens têm alt ou role="presentation"

#### Contraste
- [ ] Texto normal tem contraste ≥ 4.5:1
- [ ] Texto grande tem contraste ≥ 3:1
- [ ] Componentes de interface têm bordas/indicadores visíveis
- [ ] Links estão claramente identificáveis

#### Navegação por Teclado
- [ ] Tab order é lógico
- [ ] Foco visível em todos os elementos interativos
- [ ] Enter/Space ativam botões e links
- [ ] Escape fecha modais/dropdowns

---

## Arquivos para Modificar

### Resumo

| Arquivo | Issues | Tipo |
|---------|--------|------|
| `src/components/ui/button.tsx` | ARIA | Componente base |
| `src/components/schedule/CalendarDayColumn.tsx` | ARIA + Contraste | Calendário |
| `src/components/schedule/TimeSlotCell.tsx` | ARIA + Contraste | Calendário |
| `src/components/ui/OptimizedImage.tsx` | Contraste | Imagens |
| `src/pages/Dashboard.tsx` | Contraste | Dashboard |
| `src/pages/PatientList.tsx` | Contraste | Pacientes |

---

## Estimativa de Tempo

| Tarefa | Tempo |
|--------|-------|
| Implementar ARIA Labels | 2-3 horas |
| Implementar Contraste | 3-4 horas |
| Testes e Validação | 1-2 horas |
| **TOTAL** | **6-9 horas** |

---

## Próximos Passos

1. **Imediato:** Criar branch `fix/accessibility`
2. **Curto Prazo:** Implementar correções ARIA Labels
3. **Médio Prazo:** Implementar correções de Contraste
4. **Validação:** Testar com leitores de tela e ferramentas de contraste
5. **Deploy:** Merge e deploy para produção

---

## Referências

- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Contraste Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Best Practices](https://www.w3.org/WAI/ARIA/apg/)
