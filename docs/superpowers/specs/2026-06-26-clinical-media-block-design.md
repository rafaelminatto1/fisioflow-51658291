# Clinical Media Block Design

Date: 2026-06-26
Status: Approved for spec review
Scope: Web rich text editor used in Evolucao > Observacoes clinicas

## Objective

Replace the current image behavior in clinical observations with a robust media block that behaves closer to Notion/Evernote:

- image appears visibly inside the editable area
- image can be selected, dragged, and resized
- image supports an editable caption below
- text can exist naturally before and after the image block
- serialized content remains stable for autosave, reload, history, and collaboration

This change is specifically aimed at fixing the current broken insertion behavior where the editor shows a horizontal blue line instead of a usable image block.

## Problem Statement

The current editor already uses Tiptap and a custom image node view, but the behavior is still inadequate for clinical note authoring:

- inserted images do not consistently render as an interactive content block
- the current experience is too close to a decorated `img` atom and not a real media structure
- there is no true editable caption below the image
- the current model is fragile for selection, resizing, and future extension

The user expectation is a block-based editing experience similar to Notion/Evernote, with caption below the image, not inline image annotations or drawn overlays.

## Design Decision

Use a dedicated block node for clinical media instead of a plain image node or inline image.

Recommended model:

- a custom Tiptap node, referred to here as `clinicalMedia`
- block-level, draggable, selectable node
- image displayed at the top
- editable caption below via node content
- persistent node attributes for presentation and metadata

This is preferred over inline images because it is significantly more reliable for:

- selection
- drag-and-drop
- resize behavior
- mobile interaction
- collaboration consistency
- future extension such as replace/download/metadata controls

## User Experience

### Insert

When the user uploads an image from the toolbar:

- the upload completes as today
- the editor inserts a media block at the current cursor position
- the image becomes immediately visible in the document
- a caption field appears below with a placeholder such as `Adicionar legenda clinica...`

### Selection

When the user clicks the image block:

- the block gets a visible selected state
- a contextual toolbar becomes available
- resize and drag handles become available

### Drag

The media block can be repositioned vertically within the document flow using a drag handle.

Expected behavior:

- text above and below remains intact
- the block moves as a single unit
- accidental text selection while dragging should be minimized

### Resize

The image can be resized through a visible handle.

Expected behavior:

- width persists in node attributes
- aspect ratio is preserved by default
- layout stays within editor width constraints
- predefined width actions remain available for quick use

### Caption

The caption is editable directly below the image.

Expected behavior:

- caption supports plain rich text inline content only
- caption can be empty
- caption placeholder is visible when empty
- the cursor can move naturally from document text into caption and out again

### Contextual Actions

When selected, the media block should support:

- align left
- align center
- align right
- set width preset: 50%, 75%, 100%
- free resize via handle
- edit/replace image
- remove node

Nice-to-have actions that fit the same model:

- reset size
- download image
- edit alt/title metadata

## Data Model

### Node Type

Create a custom node such as `clinicalMedia` with:

- `group: "block"`
- `draggable: true`
- `selectable: true`
- content allowing caption text, e.g. `inline*`

### Attributes

Persisted attributes:

- `src: string`
- `alt?: string`
- `title?: string`
- `width?: string`
- `align?: "left" | "center" | "right"`

The caption should be stored as node content, not as an attribute.

This is important because:

- caption becomes editable through ProseMirror content rules
- collaboration and history remain structurally correct
- the serialized HTML stays semantic and migration-friendly

## Serialization

Use semantic HTML output with a figure-based structure.

Recommended serialized shape:

```html
<figure data-type="clinical-media" data-align="center" data-width="75%">
  <img src="..." alt="..." title="..." />
  <figcaption>Legenda clinica opcional</figcaption>
</figure>
```

Key rules:

- editor controls must not leak into saved HTML
- width/alignment must be restorable from HTML attributes
- empty caption may serialize as an empty `figcaption` or omitted caption depending on implementation preference, but parsing must support both

## Parsing and Backward Compatibility

Existing saved content may already contain:

- `img[data-rich-text-image="true"]`
- plain `img`
- custom width/alignment attributes from the current image implementation

Backward-compatibility requirements:

- existing documents must continue to load
- old image markup must be elevated into the new `clinicalMedia` node during parse/import
- old width/alignment data should be preserved when present
- missing caption becomes an empty caption

This migration should happen at the editor parsing boundary rather than requiring an immediate database migration.

## Technical Plan

### 1. Replace the current image model for clinical observations

Create a dedicated extension instead of relying only on `Image.extend(...)`.

The new extension should:

- define the `clinicalMedia` schema
- parse both new `figure` markup and legacy `img` markup
- render clean semantic HTML
- register a React node view

### 2. Build a React node view with editable caption

The node view should contain:

- non-editable controls and chrome
- image display
- resize handle
- drag handle
- editable caption area via `NodeViewContent`

Important implementation rule:

- only controls should use `contentEditable={false}`
- the caption content area must remain a real editable ProseMirror region

### 3. Integrate insertion flow

The toolbar image action should:

- upload the file as today
- call a command such as `setClinicalMedia(...)`
- insert the new media block instead of the current plain image node

### 4. CSS and interaction polish

Add targeted styles for:

- selected state
- hover state
- caption placeholder
- toolbar positioning
- resize handle affordance
- mobile-friendly spacing and hit areas

### 5. Preserve editor systems

The final implementation must remain compatible with:

- autosave debounce flow
- `normalizeEditorHtml` logic
- collaborative editing via Yjs
- existing toolbar and focus behavior

## Error Handling

### Upload errors

If upload fails:

- no empty media block should be inserted
- the user sees an error toast

### Broken image URLs

If an image URL fails to render:

- the block should remain structurally present
- a fallback visual state may be shown
- caption and removal actions should still work

### Invalid legacy markup

If old content contains malformed image HTML:

- parsing should fail gracefully
- invalid attributes should be sanitized
- document loading should not break the entire editor

## Security and Sanitization

Because the new node renders attributes into HTML:

- `src` must remain limited to safe image URLs
- width values must be constrained to valid percentage/pixel forms
- alignment must be validated against the allowed enum
- pasted/imported HTML must not blindly preserve unsafe attributes

## Testing Strategy

### Manual validation

Verify:

- insert image from toolbar
- image appears immediately
- click selects image block
- drag reorders image block
- resize persists after save/reload
- caption can be edited and saved
- remove works cleanly
- replace/edit existing image works

### Compatibility validation

Verify:

- old content with current image markup still loads
- old width/alignment survives parse
- autosave still emits stable HTML
- collaboration session does not lose media block state

### Automated coverage

At minimum add tests for:

- parsing legacy `img` into `clinicalMedia`
- rendering `clinicalMedia` back to semantic `figure` HTML
- preserving width and alignment attributes
- preserving caption content

## Out of Scope

Not included in this design:

- drawing annotations directly on top of the image
- image comments anchored to arbitrary regions
- multi-image galleries
- before/after comparison widgets inside the clinical editor
- dedicated media asset management beyond current upload flow

These can be added later on top of the media block model if needed.

## Recommended Future Enhancements

The chosen architecture should make the following additions straightforward later:

- download image action
- duplicate image block
- paste image from clipboard
- drag-and-drop file upload directly into editor
- richer caption formatting constraints
- image metadata editing
- support for other block media types such as video or PDF preview

## Acceptance Criteria

This design is successful when all of the following are true:

- inserting an image in Observacoes clinicas creates a visible media block, not a blue line
- the image can be selected, dragged, resized, and removed reliably
- the caption is editable below the image
- the document can be saved, reloaded, and edited again without losing media behavior
- old saved content with image markup continues to load without manual migration
