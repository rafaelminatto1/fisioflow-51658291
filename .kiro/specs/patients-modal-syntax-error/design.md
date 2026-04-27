# patients-modal-syntax-error Bugfix Design

## Overview

The `htmlPlugin` in `apps/web/vite.config.ts` performed a global string replacement of
`__CACHE_BUSTER__` across the entire `index.html` file during the production build. Because
`index.html` contains the inline JavaScript expression
`window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()`, the replacement
turned the valid identifier `__CACHE_BUSTER__` into a raw numeric timestamp (e.g.
`1777249895018`), producing the syntactically invalid `window.1777249895018 = ...`. JavaScript
dot-notation property access cannot start with a digit, so the browser threw
`SyntaxError: Unexpected number` before any React code could execute, crashing the entire SPA
on every page load — including `/patients?modal=create`.

**Fix applied**: Remove the `.replace(/__CACHE_BUSTER__/g, buildTime)` call from
`htmlPlugin`. The `%CACHE_BUSTER%` replacement (percent-delimited, used only in the CSS
`<link>` `href`) is kept. The JS line `window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()` is now left untouched by the plugin and evaluates correctly at runtime.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the `htmlPlugin` transform
  receives HTML that contains `window.__CACHE_BUSTER__` (a JS identifier) and a pure-numeric
  `buildTime` string, causing the replacement to produce invalid JavaScript.
- **Property (P)**: The desired behavior when the bug condition holds — the transformed HTML
  must not contain the pattern `window.<digits> =` and must be syntactically valid JavaScript.
- **Preservation**: All other substitutions performed by `htmlPlugin` (`%APP_VERSION%`,
  `%BUILD_TIME%`, `%CACHE_BUSTER%` in the CSS href) must continue to work exactly as before.
- **htmlPlugin**: The custom Vite plugin defined in `apps/web/vite.config.ts` that runs
  `transformIndexHtml` during production builds to inject build-time values into `index.html`.
- **buildTime**: A pure-numeric Unix-millisecond timestamp string (e.g. `"1777249895018"`)
  produced by `Date.now().toString()` at build time.
- **`%CACHE_BUSTER%`**: A percent-delimited placeholder used exclusively in the CSS `<link>`
  `href` attribute (`/styles/premium-design-system.css?v=__CACHE_BUSTER__` — note: the href
  uses `__CACHE_BUSTER__` as the query-string value, which is replaced via `%CACHE_BUSTER%`
  substitution). This replacement is safe because it appears inside an attribute string, not
  a JS expression.
- **`__CACHE_BUSTER__`**: The double-underscore token that appeared in the JS expression
  `window.__CACHE_BUSTER__ = ...`. The old plugin replaced this token globally, including
  inside JavaScript, which caused the syntax error.

## Bug Details

### Bug Condition

The bug manifests when the `htmlPlugin` transform processes `index.html` and the HTML
contains the token `__CACHE_BUSTER__` inside a JavaScript expression (specifically
`window.__CACHE_BUSTER__ = ...`), while `buildTime` is a pure-numeric string. The global
regex replacement converts the valid JS identifier into a numeric literal used as a property
name via dot notation, which is a syntax error.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type HtmlTransformInput { html: string, buildTime: string }
  OUTPUT: boolean

  RETURN X.html CONTAINS "window.__CACHE_BUSTER__"
     AND X.buildTime MATCHES /^\d+$/        // pure numeric string (no letters)
END FUNCTION
```

### Examples

- **Triggering case**: `buildTime = "1777249895018"`, HTML contains
  `window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()`
  → old plugin produces `window.1777249895018 = window.__BUILD_TIME__ || Date.now().toString()`
  → `SyntaxError: Unexpected number` in browser

- **Triggering case (any numeric timestamp)**: `buildTime = "1000000000000"`, same HTML
  → old plugin produces `window.1000000000000 = ...` → same SyntaxError

- **Non-triggering case (CSS href)**: `buildTime = "1777249895018"`, HTML contains
  `/styles/premium-design-system.css?v=__CACHE_BUSTER__`
  → old plugin produces `/styles/premium-design-system.css?v=1777249895018`
  → valid URL attribute, no error (this replacement is preserved by the fix)

- **Edge case (no JS expression present)**: HTML does not contain `window.__CACHE_BUSTER__`
  → bug condition does not hold; fix has no observable effect

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- The `%APP_VERSION%` placeholder in `<meta name="app-version" content="%APP_VERSION%">` and
  `window.__APP_VERSION__ = "%APP_VERSION%"` must continue to be replaced with the correct
  `appVersion` string.
- The `%BUILD_TIME%` placeholder in `<meta name="build-time" content="%BUILD_TIME%">` and
  `window.__BUILD_TIME__ = "%BUILD_TIME%"` must continue to be replaced with the correct
  `buildTime` string.
- The `%CACHE_BUSTER%` placeholder in the CSS `<link>` `href` attribute must continue to be
  replaced with the numeric `buildTime` for cache-busting purposes.
- All other HTML content not containing these placeholders must pass through the transform
  unchanged.

**Scope:**

All inputs that do NOT satisfy `isBugCondition` (i.e., HTML that does not contain
`window.__CACHE_BUSTER__` with a numeric buildTime) must be completely unaffected by this
fix. This includes:

- HTML with only `%APP_VERSION%`, `%BUILD_TIME%`, or `%CACHE_BUSTER%` placeholders
- HTML with no placeholders at all
- Any future HTML content added to `index.html` that does not use the `__CACHE_BUSTER__`
  double-underscore token in a JS context

**Note:** The actual expected correct behavior for buggy inputs is defined in the Correctness
Properties section (Property 1). This section focuses on what must NOT change.

## Hypothesized Root Cause

Based on the bug description and code inspection, the root cause is confirmed:

1. **Overly broad regex scope**: The `.replace(/__CACHE_BUSTER__/g, buildTime)` call used a
   regex that matched the token `__CACHE_BUSTER__` anywhere in the HTML string — including
   inside `<script>` blocks. There was no mechanism to restrict the replacement to attribute
   values only.

2. **Numeric string as property name via dot notation**: JavaScript allows numeric property
   names when accessed via bracket notation (`window["1777249895018"]`) but not via dot
   notation (`window.1777249895018`). The replacement produced dot-notation access with a
   numeric name, which is a parse-time syntax error.

3. **Conflation of two distinct use cases**: The `__CACHE_BUSTER__` token served two
   different purposes — as a URL query-string value in the CSS href (safe to replace with a
   number) and as a JavaScript identifier in the inline script (unsafe to replace with a
   number). The plugin did not distinguish between these contexts.

4. **Fix**: Remove the `__CACHE_BUSTER__` replacement entirely from `htmlPlugin`. The CSS
   href uses `%CACHE_BUSTER%` (percent-delimited) which is already handled by the
   `.replace(/%CACHE_BUSTER%/g, buildTime)` call. The JS line
   `window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()` is left
   untouched and evaluates correctly at runtime using the `window.__BUILD_TIME__` value
   already set by the `%BUILD_TIME%` substitution.

## Correctness Properties

Property 1: Bug Condition - Numeric Timestamp Does Not Corrupt JS Identifier

_For any_ `HtmlTransformInput` where `isBugCondition` returns true (HTML contains
`window.__CACHE_BUSTER__` and `buildTime` is a pure-numeric string), the fixed
`htmlPlugin.transformIndexHtml` SHALL produce output HTML that does NOT contain the pattern
`/window\.\d+\s*=/` and IS syntactically valid JavaScript in the inline script block.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Other Placeholder Substitutions Unchanged

_For any_ `HtmlTransformInput` where `isBugCondition` does NOT hold (HTML does not contain
`window.__CACHE_BUSTER__` with a numeric buildTime, or the token is absent), the fixed
`htmlPlugin.transformIndexHtml` SHALL produce exactly the same output as the original
function for all `%APP_VERSION%`, `%BUILD_TIME%`, and `%CACHE_BUSTER%` substitutions,
preserving all cache-busting and version-tracking behavior.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `apps/web/vite.config.ts`

**Function**: `htmlPlugin`

**Specific Changes**:

1. **Remove `__CACHE_BUSTER__` replacement**: Delete the line
   `.replace(/__CACHE_BUSTER__/g, buildTime)` from the `transformIndexHtml` chain.
   The `%CACHE_BUSTER%` replacement (`.replace(/%CACHE_BUSTER%/g, buildTime)`) is
   sufficient for the CSS href use case and must be kept.

2. **No changes to `index.html`**: The line
   `window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()` is correct
   as-is. It reads `window.__BUILD_TIME__` (which is set by the `%BUILD_TIME%` substitution)
   and falls back to `Date.now().toString()`. No modification needed.

3. **No changes to `define` block**: The `define: { __CACHE_BUSTER__: JSON.stringify(buildTime) }`
   entry in `vite.config.ts` handles compile-time replacement inside bundled JS modules
   (not `index.html`). This is unrelated to the bug and must not be changed.

**Before (buggy):**

```typescript
function htmlPlugin(appVersion: string, buildTime: string): any {
  return {
    name: "html-transform",
    apply: "build",
    transformIndexHtml(html: string) {
      return html
        .replace(/%APP_VERSION%/g, appVersion)
        .replace(/%BUILD_TIME%/g, buildTime)
        .replace(/%CACHE_BUSTER%/g, buildTime)
        .replace(/__CACHE_BUSTER__/g, buildTime);  // ← BUG: corrupts JS identifier
    },
  };
}
```

**After (fixed):**

```typescript
function htmlPlugin(appVersion: string, buildTime: string): any {
  return {
    name: "html-transform",
    apply: "build",
    transformIndexHtml(html: string) {
      return html
        .replace(/%APP_VERSION%/g, appVersion)
        .replace(/%BUILD_TIME%/g, buildTime)
        .replace(/%CACHE_BUSTER%/g, buildTime);
        // __CACHE_BUSTER__ in JS is intentionally left untouched;
        // window.__CACHE_BUSTER__ is set at runtime via window.__BUILD_TIME__
    },
  };
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that
demonstrate the bug on unfixed code (exploratory), then verify the fix works correctly and
preserves existing behavior (fix checking + preservation checking).

Since the fix has already been applied, the exploratory tests serve as regression tests —
they should FAIL on the old code and PASS on the fixed code, confirming the fix is correct.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE the fix. These tests
confirm the root cause analysis and serve as regression guards.

**Test Plan**: Write a pure unit test that extracts the `transformIndexHtml` logic and feeds
it HTML containing `window.__CACHE_BUSTER__` with a numeric `buildTime`. Assert that the
old implementation produces the invalid pattern and the fixed implementation does not.

**Test Cases**:

1. **Numeric timestamp corrupts JS identifier** (fails on unfixed code):
   Input: HTML with `window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()`,
   `buildTime = "1777249895018"` → assert output does NOT contain `window.1777249895018 =`

2. **Any 13-digit Unix timestamp** (fails on unfixed code):
   Input: same HTML, `buildTime = "1000000000000"` → same assertion

3. **CSS href replacement still works** (passes on both old and fixed code):
   Input: HTML with `/styles/premium-design-system.css?v=__CACHE_BUSTER__`,
   `buildTime = "1777249895018"` → assert output contains `?v=1777249895018`
   (Note: this uses `%CACHE_BUSTER%` in the actual file, not `__CACHE_BUSTER__`)

4. **Edge case — no JS expression** (passes on both):
   Input: HTML without `window.__CACHE_BUSTER__`, `buildTime = "1777249895018"` →
   assert output is unchanged for the JS section

**Expected Counterexamples (on unfixed code)**:

- Output HTML contains `window.1777249895018 =` — a numeric property access via dot notation
- Possible causes: overly broad regex, no context-awareness for script vs. attribute content

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function
produces syntactically valid output.

**Pseudocode:**

```
FOR ALL X WHERE isBugCondition(X) DO
  result := htmlPlugin_fixed(X)
  ASSERT result DOES NOT MATCH /window\.\d+\s*=/
  ASSERT result IS VALID JAVASCRIPT (inline script block parseable)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed
function produces the same result as the original function.

**Pseudocode:**

```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT htmlPlugin_original(X) = htmlPlugin_fixed(X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many `(appVersion, buildTime)` combinations automatically
- It catches edge cases (empty strings, strings with special regex characters, very long
  version strings) that manual tests would miss
- It provides strong guarantees that `%APP_VERSION%`, `%BUILD_TIME%`, and `%CACHE_BUSTER%`
  substitutions are preserved for all valid inputs

**Test Cases**:

1. **`%APP_VERSION%` substitution preserved**: For any `appVersion` string, the fixed plugin
   replaces `%APP_VERSION%` in the HTML with the correct value — same as the original.

2. **`%BUILD_TIME%` substitution preserved**: For any `buildTime` string, the fixed plugin
   replaces `%BUILD_TIME%` in the HTML with the correct value — same as the original.

3. **`%CACHE_BUSTER%` CSS href substitution preserved**: For any numeric `buildTime`, the
   fixed plugin replaces `%CACHE_BUSTER%` in the CSS href — same as the original.

4. **No spurious changes**: HTML content not containing any of the three placeholders passes
   through the fixed plugin unchanged.

### Unit Tests

- Test that `transformIndexHtml` with a numeric `buildTime` does NOT produce `window.<digits> =`
- Test that `%APP_VERSION%` is replaced correctly with an arbitrary version string
- Test that `%BUILD_TIME%` is replaced correctly with an arbitrary timestamp string
- Test that `%CACHE_BUSTER%` in the CSS href is replaced correctly with the numeric timestamp
- Test that HTML without any placeholders passes through unchanged

### Property-Based Tests

- Generate arbitrary `appVersion` strings (alphanumeric + semver-like) and verify
  `%APP_VERSION%` is always substituted correctly (Property 2)
- Generate arbitrary numeric `buildTime` strings and verify `%CACHE_BUSTER%` in the CSS
  href is always substituted, while `window.__CACHE_BUSTER__` in JS is never corrupted
  (Property 1 + Property 2)
- Generate arbitrary HTML strings without the known placeholders and verify the fixed plugin
  produces identical output to the original for those inputs (Preservation)

### Integration Tests

- Build the production bundle and verify `dist/index.html` does not contain
  `window.<digits> =` anywhere
- Load the built `index.html` in a headless browser and verify no SyntaxError is thrown
- Navigate to `/patients?modal=create` in the built app and verify the modal opens without
  a crash (E2E regression test)
