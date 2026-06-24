# Exercise Expanded Preview Design

## Context

The unified evolution block in `src/components/evolution/v3-unified/EvolutionBlockV3.tsx`
already supports expanding exercise rows for editing prescription and patient feedback.
It also already imports and uses `ExerciseViewModal` for detailed exercise viewing in
other flows inside the same component.

Today, the expanded exercise area leaves unused visual space and does not expose the
exercise media preview inline. The user wants that space to render the exercise image
and allow opening the existing exercise modal by clicking the image.

## Goal

When an exercise item is expanded inside "Procedimentos & exercícios":

- render the exercise image/thumbnail in the expanded content area
- make the preview clickable
- open the existing `ExerciseViewModal` on click
- keep current prescription and patient feedback editing intact
- show a clickable placeholder when the exercise has no image

## Non-Goals

- redesigning the existing exercise modal
- changing the row header behavior
- changing exercise persistence shape or API contracts
- adding new media fetching endpoints

## Recommended Approach

Reuse the existing `ExerciseViewModal` state in `EvolutionBlockV3` and pass an
`onOpenExercise` callback into `EvolutionItemRow`.

Inside each expanded exercise row:

- resolve the exercise from `useExercises()` using `exerciseId`
- compute a preview source from `thumbnail_url`, `image_url`, or the library exercise
- render a preview card in the expanded section
- on click, call `onOpenExercise(resolvedExercise)`
- if no media exists but the exercise is resolved, render a placeholder card that still
  opens the modal

This keeps the interaction model consistent with the rest of the product and avoids
creating a second exercise detail surface.

## Component Changes

### `EvolutionItemRow`

- Add `onOpenExercise?: (exercise: Exercise) => void`
- Add a derived `resolvedExercise` from the library lookup
- In the expanded exercise layout, introduce a media preview block
- Guard the click action so it only runs when a real exercise object is available

### `EvolutionBlockV3`

- Pass `setViewExercise` down as the row open handler
- Keep the existing `ExerciseViewModal` render path unchanged

## UI Behavior

- Clicking the preview image opens the exercise modal
- Clicking the placeholder opens the same modal
- If the row belongs to a free-text exercise with no linked `exerciseId`, no modal action
  is shown because there is no source exercise to display
- Existing expand/collapse, reorder, remove, and form inputs remain unchanged

## Risks

- The row can contain stale `thumbnail_url`/`image_url` data while the library record has
  newer media; using the same fallback chain as the header minimizes inconsistency
- Tight horizontal space in the embedded variant can cause layout pressure; the preview
  block should collapse cleanly below the form fields on narrow widths if needed

## Validation

- Expand an exercise with thumbnail and confirm the image appears inline
- Click the image and confirm `ExerciseViewModal` opens with the expected exercise
- Expand an exercise without image and confirm the placeholder appears
- Confirm prescription and patient feedback inputs still update normally
- Confirm procedures are unaffected
