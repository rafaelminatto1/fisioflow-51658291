# Design System Strategy: The Kinetic Sanctuary

## 1. Overview & Creative North Star
This design system is built to transform a traditional clinical service into a premium digital experience. The **Creative North Star** is "The Kinetic Sanctuary"—a concept that balances the high-precision world of physiotherapy with a deep, immersive atmosphere of recovery and focus.

We break the "template" look by rejecting the rigid, boxy layouts typical of health websites. Instead, we embrace **intentional asymmetry**, where imagery and typography overlap to suggest movement and fluidity. By utilizing a dark, tonal palette, we create a high-end editorial feel that positions the brand as an elite authority in human performance and recovery.

## 2. Colors
The palette is rooted in deep obsidian tones with surgical blue accents, designed to feel both modern and trustworthy.

### Core Palette
- **Primary Accent (`#2196F3`):** Used sparingly for "luminous" moments—CTAs, active states, and critical health data. This is derived from the `primary_color_hex` token.
- **Secondary Accent (`#00AEEF`):** A supporting color for less prominent UI elements, chips, and secondary actions, derived from `secondary_color_hex`.
- **Tertiary Accent (`#FFFFFF`):** An additional accent color for highlights, badges, or decorative elements, derived from `tertiary_color_hex`.
- **Neutral Base (`#131313`):** A neutral base color for backgrounds, surfaces, and non-chromatic elements, derived from `neutral_color_hex`.
- **Surface Hierarchy (`#131313` to `#353535`):** A sophisticated range of dark greys used to build depth without relying on color.

### The "No-Line" Rule
To maintain a high-end feel, **1px solid borders are prohibited** for sectioning or containment. Boundaries must be defined solely through background color shifts.
- *Example:* A card using `surface-container-highest` sits directly on a `surface` background. The change in luminance creates the edge, making the UI feel "carved" rather than "drawn."

### Glassmorphism & Texture
- **Floating Depth:** Navigation bars and floating action cards should utilize a "Glass" effect: `surface-container` with 80% opacity and a `20px` backdrop blur.
- **Signature Gradients:** For primary CTAs, use a subtle linear gradient from `primary-container` (#2196F3) to a slightly darker shift. This adds a "physical" quality to digital buttons, evoking a sense of premium hardware.

## 3. Typography
The typography system uses a dual-font strategy to balance editorial impact with clinical clarity.

- **Display & Headlines (Manrope):** A modern, geometric sans-serif, derived from `headline_font`. Use `display-lg` for hero statements with tight letter-spacing (-0.02em) to create a bold, authoritative "magazine" look.
- **Body & Titles (Inter):** A workhorse typeface designed for legibility, derived from `body_font`. Use `body-md` for patient information and `title-sm` for sub-headers.
- **Labels (Inter):** The font for labels, derived from `label_font`.
- **Editorial Hierarchy:** Use extreme scale contrast. A `display-lg` headline should sit near `body-sm` metadata to create a sophisticated, unbalanced layout that guides the eye with intent.

## 4. Elevation & Depth
Depth in this design system is achieved through **Tonal Layering** rather than traditional drop shadows.

### The Layering Principle
Treat the UI as a series of physical layers of fine material.
- **Base Layer:** `surface` (#131313).
- **Secondary Sections:** `surface-container-low`.
- **Interactive Cards:** `surface-container-high`.
- **Pop-overs/Modals:** `surface-container-highest`.

### Ambient Shadows
When a "floating" effect is mandatory (e.g., a floating appointment button), shadows must be extra-diffused.
- **Specs:** Blur: 32px, Spread: -4px, Opacity: 8% of `on-surface`.
- **Ghost Borders:** If accessibility requires a container edge, use the `outline-variant` token at **15% opacity**. Never use 100% opaque lines.

## 5. Components

### Buttons
- **Primary:** High-contrast `primary` background with `on-primary` text. Corners use the `subtle` (roundedness 1) radius for a "technical" feel, derived from `roundedness`.
- **Secondary/Ghost:** No background fill. Use a `Ghost Border` (15% opacity outline) that becomes 40% on hover.

### Cards & Content Blocks
- **The "No Divider" Rule:** Forbid horizontal lines between list items. Use vertical white space from the spacing scale or subtle `surface-container` shifts to separate content.
- **Imagery:** Professional photography should use a subtle dark gradient overlay (bottom-to-top) to ensure `on-surface` text remains legible while integrating the image into the dark aesthetic.

### Input Fields
- **Style:** Understated. Use a `surface-container-highest` fill with a `Ghost Border` bottom-stroke. Labels should use `label-md` and sit 8px above the input field, never inside.

### Specialty Components (Physiotherapy Context)
- **Recovery Timeline:** A vertical stepper using `primary` dots and `outline-variant` dashed lines (at 20% opacity) to track patient progress.
- **Treatment Chips:** Selection chips for "Manual Therapy" or "Recovery" using `surface-container-high` that transition to `primary-container` when active.

## 6. Do's and Don'ts

### Do:
- **Use "Breathing Room":** Leverage large margins (64px+) between sections to allow the professional imagery to "breathe," in line with `normal` spacing (spacing 2).
- **Layer Elements:** Allow a headline to slightly overlap an image container to create a 3D, editorial effect.
- **Focus on Typography:** Let the `display-lg` size do the heavy lifting for visual interest rather than adding "decorative" icons.

### Don't:
- **Don't use #000000:** Pure black feels "dead." Always use the `neutral_color_hex` (`#131313`) or `surface-container-lowest` for dark backgrounds to maintain tonal depth.
- **Don't use Standard Shadows:** Avoid the "fuzzy grey" shadow. If it doesn't look like natural ambient light, remove it.
- **Don't use High-Contrast Grids:** Avoid 12-column grids that feel restrictive. Use asymmetrical columns (e.g., a 4-column text block next to an 8-column image) for a more custom, high-end feel.