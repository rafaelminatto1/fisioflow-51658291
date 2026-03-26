# Design System v2.0 - Premium Identity & Enhanced Interactions

## Overview

The Design System v2.0 transforms FisioFlow with a premium identity, sophisticated gradients, and polished micro-interactions. This version focuses on visual differentiation while maintaining accessibility and performance.

## Table of Contents

1. [Gradients System](#gradients-system)
   - Brand Gradient
   - Secondary Gradient
   - Accent Gradient
   - Warm Gradient
   - Cool Gradient
   - Dark Gradient
   - Glass Gradient
   - Neon Gradient
   - Gold Gradient
   - Success Gradient
   - Light Variants

2. [Typography System](#typography-system)
   - Font Display (Outfit)
   - Font Utilities (sizes, weights, tracking)
   - Usage Guidelines

3. [Interactions System](#interactions-system)
   - Hover States
   - Focus States
   - Active/Pressed States
   - Premium Transitions

4. [CSS Utilities](#css-utilities)
   - Motion Tokens
   - Easing Curves
   - Shadow System
   - Glassmorphism Effects

## Quick Start

### Installation

Add this to your project's `index.html`:

```html
<link rel="stylesheet" href="/styles/premium-design-system.css" />
```

### Import Key Classes

```tsx
// Gradients
<div className="gradient-brand">Brand Gradient</div>
<div className="gradient-success">Success Gradient</div>
<div className="gradient-warm">Warm Gradient</div>
<div className="gradient-dark">Dark Gradient</div>
<div className="gradient-neon">Neon Gradient</div>
<div className="gradient-glass">Glass Effect</div>
<div className="gradient-gold">Gold Gradient</div>

// Typography
<h1 className="font-display">Heading 1</h1>
<h2 className="font-display-title">Heading 2</h2>
<p className="font-display-heading">Heading 3</p>

// Interactions
<div className="card-premium-hover">Premium Hover Card</div>
<button className="magnetic-button">Magnetic Button</button>
<div className="glow-on-hover">Glow on Hover</div>
```

## Migration Guide

### Migrating from v1 to v2.0

1. **Replace Solid Colors with Gradients**

```tsx
// Before
<div className="bg-primary text-white">Content</div>

// After
<div className="gradient-brand text-white">Content</div>
```

2. **Add Premium Hover Effects**

```tsx
// Before
<div className="bg-card">Content</div>

// After
<div className="card-premium-hover bg-card">Content</div>
```

3. **Apply Font Display to Headings**

```tsx
// Before
<h1 className="text-2xl font-bold">Heading</h1>

// After
<h1 className="font-display-title">Heading</h1>
```

## Best Practices

- Use gradients strategically for key elements (cards, buttons, headers)
- Keep text readable on gradient backgrounds (use white or dark backgrounds for gradients)
- Use font-display sparingly (headings, important labels)
- Apply magnetic-button to interactive elements (buttons, links)
- Use glow-on-hover for call-to-action buttons
- Test contrast ratios to ensure WCAG AA compliance (4.5:1 for normal text)
- Consider motion preferences and prefers-reduced-motion

## Accessibility Notes

- All gradients maintain WCAG AA+ contrast ratios
- Focus states meet or exceed WCAG 2.4.7:3 Focus Visible (AA) requirement
- Hover states don't rely solely on color changes
- Keyboard navigation is fully supported
- ARIA attributes are properly defined
- Reduced motion is supported via CSS media queries

## Browser Support

- Modern browsers: Chrome 100+, Firefox 100+, Safari 14.1+, Edge 100+
- Graceful degradation for older browsers
- Mobile browsers: Full feature support (gradients, animations, transitions)

## Performance

- CSS animations use transform and opacity (hardware-accelerated)
- Gradients use linear-gradient (browser optimized)
- Transitions use ease-out-back (browser optimized)
- Shadow use rgba values (compositor blending)
