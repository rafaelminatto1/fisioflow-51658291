# SOAP Evolution Style Guide

## Typography Scale

| Usage | Font Size | Weight | Letter Spacing |
|-------|-----------|--------|----------------|
| Header Title | 18px | 700 | -0.3px |
| Header Subtitle | 12px | 400 | Normal |
| Card Title | 18px | 600 | -0.3px |
| Section Title | 18px | 600 | -0.3px |
| Field Label | 15px | 600 | -0.2px |
| Field Description | 12px | 400 | Normal |
| Input Text | 16px | 400 | Normal |
| Button Text | 16px | 700 | -0.3px |
| Caption/Muted | 11-13px | 500 | Normal |

## Spacing Scale

| Name | Value | Usage |
|------|-------|-------|
| xs | 4px | Small gaps |
| sm | 8px | Element spacing |
| md | 12px | Card padding |
| lg | 16px | Section margins |
| xl | 20px | Card padding |
| 2xl | 24px | Large spacing |
| 3xl | 32px | Bottom safe area |

## Border Radius Scale

| Name | Value | Usage |
|------|-------|-------|
| sm | 10px | Small elements |
| md | 12px | Buttons |
| lg | 14px | Input fields |
| xl | 16px | Cards (small) |
| 2xl | 20px | Main cards |
| circle | 50% | Circular buttons, badges |

## Shadow System

```typescript
// Subtle shadow for cards
shadowColor: '#000'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.05
shadowRadius: 8
elevation: 2

// Medium shadow for buttons
shadowColor: '#000'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.1
shadowRadius: 8
elevation: 3

// Strong shadow for floating elements
shadowColor: '#000'
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.15
shadowRadius: 12
elevation: 5
```

## Color Opacity Variants

```typescript
// 10% opacity for subtle backgrounds
backgroundColor: `${color}10`

// 15% opacity for badges
backgroundColor: `${color}15`

// 20% opacity for more prominent backgrounds
backgroundColor: `${color}20`
```

## Touch Target Sizes

- Minimum touch target: 44x44px
- Back button: 40x40px circular
- Action buttons: Minimum 48px height
- Photo thumbnails: ~48% of screen width

## Component Specifications

### Header
- Height: ~64px
- Padding: 12px horizontal
- Border: 1px bottom
- Back button: 40x40px circle
- Progress ring: 44x44px

### Patient Card
- Padding: 16px
- Border radius: 16px
- Avatar: 48x48px circle
- Status dot: 8x8px circle

### Pain Level Card
- Padding: 20px
- Border radius: 20px
- Emoji container: 72x72px circle
- Value badge: 56x56px circle

### SOAP Field
- Badge: 32x32px circle
- Input border radius: 14px
- Input padding: 16px horizontal, 14px vertical
- Min height: 100px

### Photo Grid
- Gap: 12px
- Photo width: (Screen Width - 32 - 36) / 2
- Photo aspect ratio: 1:1
- Remove button: 28x28px circle
- Add photo button: same as photo, 2px dashed border

### Save Button
- Height: 54px (18px padding vertical)
- Border radius: 16px
- Gap between icon and text: 10px

## Animation Timings

- Focus state: 200ms
- Button press: 100ms (activeOpacity)
- Progress bar: 300ms

## Icon Sizes

| Usage | Size |
|-------|------|
| Header icons | 22-24px |
| Section icons | 20-22px |
| Badge icons | 14-18px |
| Button icons | 18-20px |
| Large display | 40px |
