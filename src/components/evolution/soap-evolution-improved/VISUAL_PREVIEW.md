# Visual Preview Guide

## Screen Layout Overview

```
+------------------------------------------+
|  HEADER                                   |
|  [<-]  Nova Evolução    10/fev    [75%]  |
+------------------------------------------+
|  PATIENT CARD                             |
|  [Avatar]  Patient Name           [●]     |
|            Sessão de avaliação   Em andamento |
+------------------------------------------+
|  PAIN LEVEL CARD                          |
|  [Nivel de Dor (EVA)]                    |
|                                          |
|  (😊)              [7] / 10               |
|                                          |
|  ┌─────────────────────────────────┐    |
|  │ Dor moderada - Paciente sente  │    |
|  │ desconforto mas consegue continuar │  |
|  └─────────────────────────────────┘    |
|                                          |
|  [====●====]  Slider                    |
+------------------------------------------+
|  SOAP CARD                                |
|  [Registro SOAP]              [75%]      |
|  [█████████████░░░░] Progress Bar        |
|                                          |
|  [S] Subjetivo              [✓]          |
|  ┌─────────────────────────────┐        |
|  │ Patient reported...         │        |
+  │                             │       +
|  │ 150 caracteres         [×]  │        |
|  └─────────────────────────────┘        |
|                                          |
|  [O] Objetivo              [✓]          |
|  ┌─────────────────────────────┐        |
|  │ Measurements: ADM...        │        |
+  │                             │       +
|  │ 85 caracteres          [×]  │        |
|  └─────────────────────────────┘        |
|                                          |
|  [A] Avaliação            [  ]          |
|  ┌─────────────────────────────┐        |
|  │ Clinical interpretation...  │        |
+  │                             │       +
|  │ 0 caracteres               │        |
|  └─────────────────────────────┘        |
|                                          |
|  [P] Plano                [✓]          |
|  ┌─────────────────────────────┐        |
|  │ Next steps: exercises...    │        |
|  │                             │        |
+  │ 200 caracteres         [×]  │        +
|  └─────────────────────────────┘        |
+------------------------------------------+
|  PHOTOS CARD                              |
|  [Fotos e Anexos]              [3/5]     |
|                                          |
|  ┌──────┐  ┌──────┐  ┌──────┐          |
|  │ Photo│  │ Photo│  │ [+ ]  │          |
+  │  [×] │  │  [×] │  │      │          +
|  └──────┘  └──────┘  └──────┘          |
|                                          |
|  [📷 Galeria]  [📷 Câmera]              |
+------------------------------------------+
|                                          |
|  ┌─────────────────────────────┐        |
|  │  ✓ Salvar Evolução          │        |
|  └─────────────────────────────┘        |
|  Preencha pelo menos um campo...        |
|                                          |
+------------------------------------------+
```

## Color Scheme Reference

### Subjective (S) - Blue
- Primary: `#3B82F6`
- Dark: `#2563EB`
- Light: `#DBEAFE`
- Gradient: `#3B82F6` → `#2563EB`

### Objective (O) - Green
- Primary: `#10B981`
- Dark: `#059669`
- Light: `#D1FAE5`
- Gradient: `#10B981` → `#059669`

### Assessment (A) - Orange
- Primary: `#F59E0B`
- Dark: `#D97706`
- Light: `#FEF3C7`
- Gradient: `#F59E0B` → `#D97706`

### Plan (P) - Purple
- Primary: `#8B5CF6`
- Dark: `#7C3AED`
- Light: `#EDE9FE`
- Gradient: `#8B5CF6` → `#7C3AED`

## Component Details

### Header
- Height: 64px
- Back button: 40px circle with surface background
- Progress ring: 44px diameter with animated stroke
- Date: 12px, capitalized, textSecondary color

### Patient Card
- Padding: 16px
- Avatar: 48px circle with 20% opacity primary color
- Status dot: 8px circle, success color
- Shadow: Subtle (2px offset, 0.05 opacity)

### SOAP Letter Badge
- Size: 32px circle
- Font: 16px, weight 800, white
- Shadow: 1px offset, 0.1 opacity
- Positioned at left of field header

### Input Field (Focused)
- Border: 2px, animated to section color
- Border radius: 14px
- Padding: 16px horizontal, 14px vertical
- Min height: 100px
- Font: 16px, line height 22px

### Input Field (Unfocused)
- Border: 2px, border color
- All other dimensions same

### Pain Level Display
- Emoji container: 72px circle with 15% opacity pain color
- Value badge: 56px circle with pain color fill
- Description card: Full width, 10% opacity pain color background

### Photo Grid
- Photo width: ~46% of screen width (with margins)
- Gap: 12px between items
- Border radius: 16px
- Remove button: 28px red circle, top-right corner
- Add button: Same size, 2px dashed border

### Save Button
- Height: 54px (18px padding)
- Border radius: 16px
- Icon + text with 10px gap
- Shadow: Medium elevation (3)
- Disabled: Border color, 60% opacity

## Interaction States

### Input Focus
```
Unfocused:  [border: 2px solid #E5E7EB]
Focused:    [border: 2px solid #3B82F6] (animated 200ms)
```

### Button Press
```
Normal:     [opacity: 1.0]
Pressed:    [opacity: 0.7] (activeOpacity)
Disabled:   [opacity: 0.6, backgroundColor: #E5E7EB]
```

### Photo Hover (for web/debug)
```
Normal:     [scale: 1.0]
Hovered:    [scale: 1.02] (future enhancement)
```

## Animation Timings

- Focus border: 200ms ease
- Progress bar: 300ms ease
- Button press: Instant (activeOpacity)
- Page transitions: Platform default

## Accessibility

All interactive elements meet WCAG 2.1 AA standards:
- Touch targets: Minimum 44x44px
- Color contrast: Minimum 4.5:1 for text
- Focus indicators: Visible on all inputs
- Icons: Paired with text labels where appropriate

## Responsive Breakpoints

While primarily designed for mobile, the layout adapts:
- < 375px: Compact padding (12px)
- 375-428px: Standard padding (16px)
- > 428px: Large padding (20px)
- Tablet: Could use 2-column layout (future enhancement)
