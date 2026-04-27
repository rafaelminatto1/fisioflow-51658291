# patients-modal-syntax-error — Implementation Tasks

## Tasks

- [x] 1. Verify the fix in vite.config.ts
  - [x] 1.1 Confirm `htmlPlugin` in `apps/web/vite.config.ts` no longer contains `.replace(/__CACHE_BUSTER__/g, buildTime)`
  - [x] 1.2 Confirm `.replace(/%CACHE_BUSTER%/g, buildTime)` is still present (CSS href cache-busting)
  - [x] 1.3 Confirm `index.html` still contains `window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()` untouched

- [x] 2. Write exploratory / fix-checking unit tests
  - [x] 2.1 Create test file `apps/web/src/tests/htmlPlugin.test.ts` with a local copy of both the buggy and fixed `transformIndexHtml` logic
  - [x] 2.2 Write test: numeric buildTime does NOT produce `window.<digits> =` in output (fix-checking — Property 1)
  - [x] 2.3 Write test: `%APP_VERSION%` placeholder is replaced correctly (preservation — Property 2)
  - [x] 2.4 Write test: `%BUILD_TIME%` placeholder is replaced correctly (preservation — Property 2)
  - [x] 2.5 Write test: `%CACHE_BUSTER%` in CSS href is replaced correctly (preservation — Property 2)
  - [x] 2.6 Write test: HTML without any placeholders passes through unchanged (preservation — Property 2)
  - [x] 2.7 Write test (exploratory/regression): buggy implementation DOES produce `window.<digits> =` — confirms the old code was broken

- [x] 3. Write property-based tests
  - [x] 3.1 Write PBT: for any numeric `buildTime` string, fixed transform output never matches `/window\.\d+\s*=/` (Property 1 — fast-check)
  - [x] 3.2 Write PBT: for any `appVersion` string, `%APP_VERSION%` is always substituted correctly and equals the original transform output for that placeholder (Property 2 — fast-check)
  - [x] 3.3 Write PBT: for any `buildTime` string, `%BUILD_TIME%` and `%CACHE_BUSTER%` substitutions in fixed transform equal those in original transform (Property 2 — fast-check)
  - [x] 3.4 Write PBT: for any HTML string not containing `%APP_VERSION%`, `%BUILD_TIME%`, `%CACHE_BUSTER%`, or `__CACHE_BUSTER__`, fixed transform output equals original transform output (Preservation — fast-check)

- [x] 4. Run the test suite and confirm all tests pass
  - [x] 4.1 Run `pnpm test:unit` (or `pnpm vitest --run apps/web/src/tests/htmlPlugin.test.ts`) and verify all tests pass
  - [x] 4.2 Confirm the exploratory regression test (task 2.7) passes — i.e., the buggy implementation is correctly identified as broken

- [x] 5. Integration verification
  - [x] 5.1 Run `pnpm build` (or `pnpm build:prod`) and verify the build completes without errors
  - [x] 5.2 Inspect `apps/web/dist/index.html` and confirm it does not contain `window.\d+ =`
  - [x] 5.3 Inspect `apps/web/dist/index.html` and confirm `%CACHE_BUSTER%` has been replaced in the CSS href (e.g., `?v=<timestamp>`)
  - [x] 5.4 Inspect `apps/web/dist/index.html` and confirm `window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()` is present verbatim (untouched by the plugin)
