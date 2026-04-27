# Bugfix Requirements Document

## Introduction

A `SyntaxError: Unexpected number` crashes the entire page when navigating to `/patients?modal=create`. The error occurs because the Vite HTML transform plugin (`htmlPlugin` in `apps/web/vite.config.ts`) replaces the literal token `__CACHE_BUSTER__` anywhere it appears in `index.html` — including inside JavaScript expressions — with the raw numeric build timestamp (e.g. `1777249895018`). This turns the valid assignment `window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()` into the syntactically invalid `window.1777249895018 = window.__BUILD_TIME__ || Date.now().toString()`, because JavaScript property names accessed via dot notation cannot begin with a digit. The error is thrown before any React code executes, so the entire SPA fails to boot on that page load.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the production build is generated AND the `htmlPlugin` processes `apps/web/index.html` THEN the system replaces the token `__CACHE_BUSTER__` inside the inline `<script>` block with the raw numeric timestamp string (e.g. `1777249895018`), producing the invalid JavaScript expression `window.1777249895018 = ...`

1.2 WHEN a browser loads the built `index.html` (on any route, including `/patients?modal=create`) THEN the system throws `SyntaxError: Unexpected number` at the line containing `window.1777249895018`, halting execution of the entire inline script block

1.3 WHEN the inline script block fails with a SyntaxError THEN the system does not initialize the global constants (`window.__APP_VERSION__`, `window.__BUILD_TIME__`, etc.) that the application depends on, causing the React app to fail to boot

### Expected Behavior (Correct)

2.1 WHEN the production build is generated AND the `htmlPlugin` processes `apps/web/index.html` THEN the system SHALL substitute `%CACHE_BUSTER%` (percent-delimited placeholder) in the CSS link `href` attribute with the numeric timestamp, while leaving the JavaScript variable name `window.__CACHE_BUSTER__` untouched (or replacing it with a valid identifier)

2.2 WHEN a browser loads the built `index.html` THEN the system SHALL execute the inline script block without any SyntaxError, successfully initializing all global constants

2.3 WHEN the inline script block executes successfully THEN the system SHALL allow the React application to boot normally on all routes, including `/patients?modal=create`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the production build is generated THEN the system SHALL CONTINUE TO replace `%APP_VERSION%` and `%BUILD_TIME%` placeholders in `index.html` with their correct string values

3.2 WHEN the production build is generated THEN the system SHALL CONTINUE TO replace the `%CACHE_BUSTER%` placeholder in the CSS `<link>` `href` attribute (`/styles/premium-design-system.css?v=__CACHE_BUSTER__`) with the numeric timestamp for cache-busting purposes

3.3 WHEN the application loads in the browser THEN the system SHALL CONTINUE TO expose `window.__APP_VERSION__` and `window.__BUILD_TIME__` as string globals for version tracking and cache invalidation logic

3.4 WHEN the application version changes between deployments THEN the system SHALL CONTINUE TO clear `sessionStorage` and update `localStorage` with the new version and build time values

---

## Bug Condition Derivation

**Bug Condition Function:**

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type HtmlTransformInput
  OUTPUT: boolean

  // Returns true when the htmlPlugin replaces __CACHE_BUSTER__ inside a JS expression
  RETURN X.html CONTAINS "window.__CACHE_BUSTER__"
     AND X.buildTime MATCHES /^\d+$/   // pure numeric string
END FUNCTION
```

**Property: Fix Checking**

```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← htmlPlugin'(X)
  ASSERT result.html DOES NOT CONTAIN /window\.\d+\s*=/   // no numeric property access
  ASSERT result.html IS VALID JAVASCRIPT                   // no SyntaxError
END FOR
```

**Property: Preservation Checking**

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT htmlPlugin(X) = htmlPlugin'(X)   // all other substitutions unchanged
END FOR
```
