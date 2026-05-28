# Frontend Redesign — Remaining Work

## Completed

- [x] **Phase 0** `[Opus]` — Token layer: CSS vars, Tailwind config, Inter/JetBrains Mono, theme reducer, `statusColors.js`
- [x] **Phase 1a** `[Sonnet]` — Shell: SkipLink, HashDisplay, Navigation, Footer, App/AppContent wiring
- [x] **Phase 1b** `[Opus]` — Auth surfaces: WalletConnect, UserRegistration, RoleSelector

---

## Remaining

### Phase 2 — Shared Primitives `[Sonnet]`

API spec was designed by Opus (see previous session). Sonnet implements in this order:

1. `client/src/components/ui/LoadingSpinner.js` — add token color names (`accent`, `success`, `current`, `on-accent`, `muted`); legacy names (`blue`, `green`, `purple`, `gray`, `white`) become aliases so existing callers don't break. Default `color="accent"`. Update `fullScreen` backdrop + label colors.
2. `client/src/components/StyledComponents.js` — **delete** `GlassContainer` and `ConnectButton` entirely. Rewrite `Button` to use token variants, `focus-visible:` rings, `disabled:opacity-60`, and `LoadingSpinner` instead of the inline spinner. Rewrite `Card` with token surface + optional elevation/padding props. Rewrite `FormInput`/`FormSelect` with token-driven input styles.
3. `client/src/components/ui/index.js` — remove `GlassContainer` and `ConnectButton` from re-exports.
4. `client/src/components/ui/FormField.js` — class-only swap: `text-gray-700` → `text-fg`, `text-red-500/600` → `text-danger`, `text-gray-500` → `text-fg-muted`, `border-red-300` → `border-danger`. A11y wiring untouched.
5. `client/src/components/ui/Modal.js` — backdrop `bg-black/50` → `bg-fg/50 backdrop-blur-sm`; panel `bg-white rounded-xl shadow-xl` → `bg-surface-raised border border-line rounded-token-lg shadow-soft-lg`. FocusTrap and scroll-lock unchanged.
6. `client/src/components/ui/TabNavigation.js` — active: `border-blue-500 text-blue-600` → `border-accent text-accent`; inactive: `text-gray-500 hover:text-gray-700 hover:border-gray-300` → `text-fg-muted hover:text-fg hover:border-line-strong`. Add `focus-visible:` rings.
7. `client/src/components/ui/ErrorDisplay.js` — `bg-red-50 border-red-200 text-red-700` → `bg-danger-soft border-danger/30 text-danger`. Button rings → `focus-visible:ring-focus-ring`.
8. `client/src/components/ui/NotificationsContainer.js` — switch from solid-color panels to soft-tinted per type (`bg-success-soft`, `bg-danger-soft`, `bg-warning-soft`, `bg-info-soft`). Text inherits from parent (drop `text-white`).

**Verify after all 8 files:**

```bash
cd client && NODE_ENV=development npx react-scripts build 2>&1 | grep -iE "warning|error"
# Expect: empty

grep -rnE 'bg-(blue|red|green|yellow|purple|gray)-[0-9]|text-(blue|red|green|yellow|purple|gray)-[0-9]' \
  src/components/ui src/components/StyledComponents.js
# Expect: empty
```

---

### Phase 3 — Dashboard `[Sonnet]`

`client/src/components/dashboard/Dashboard.js` (~1628 LOC). Apply token swaps throughout:

- Status colors → `statusColors.js` helpers (`statusBadgeClass`, `statusTextClass`, `statusBgClass`)
- Hard-coded grays → `text-fg-muted`, `text-fg-subtle`
- Blues → `text-accent`, `bg-accent`, `bg-accent/10`
- Card surfaces → `bg-surface border border-line`
- `LoadingSpinner color="green"` → `color="success"`

---

### Phase 4 — Data-Heavy Pages `[Sonnet]`

In priority order (one PR-sized unit each):

1. `client/src/pages/DataMarketplace.js` (~1018 LOC)
2. `client/src/pages/AccessHistoryPage.js` (~833 LOC) — use `HashDisplay` for IDs
3. `client/src/pages/DataContributionPortal.js` (~787 LOC)
4. `client/src/pages/TransactionPage.js` (~516 LOC) — heavy `HashDisplay` adoption for tx hashes
5. `client/src/components/DataBrowserView.js` / `DataBrowser.js`
6. `client/src/components/analytics/` — DataVisualization, StatisticalAnalysis, PopulationStudies
7. `client/src/pages/StoragePage.js`

---

### Phase 5 — Profile + Resources `[Sonnet]`; `[Opus]` if auth/privacy overlap

- `client/src/components/ProfileManager.js` — visual-only swap (logic was refactored in a prior task)
- `client/src/pages/resources/` — 6 pages, mostly typography work (static content)

---

### Phase 6 — A11y Polish `[Sonnet]` + `[Haiku]` for mechanical ✅ COMPLETE

- Audit all pages for `text-gray-500` survivors → remap to `text-fg-muted`/`text-fg-subtle` ✅
- Add `aria-live` regions on data filters and pagination ✅
- Add `<caption>` or heading-above-table on all data tables ✅
- Add `eslint-plugin-jsx-a11y` as dev dep; run and fix violations ✅ (0 violations)
- Optional: `@axe-core/react` in dev mode only

---

## Token Quick Reference

| Concept                      | Class                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Page background              | `bg-page`                                                                       |
| Card/container               | `bg-surface border border-line`                                                 |
| Elevated (nav/modal)         | `bg-surface-raised`                                                             |
| Body text                    | `text-fg`                                                                       |
| Secondary text               | `text-fg-muted`                                                                 |
| Tertiary/placeholder         | `text-fg-subtle`                                                                |
| Primary action               | `bg-accent hover:bg-accent-hover text-accent-fg`                                |
| Focus ring                   | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring` |
| Success                      | `bg-success-soft text-success`                                                  |
| Warning                      | `bg-warning-soft text-warning`                                                  |
| Danger                       | `bg-danger-soft text-danger`                                                    |
| Info                         | `bg-info-soft text-info`                                                        |
| Monospace (addresses/hashes) | `font-mono` via `HashDisplay` component                                         |
| Shadows                      | `shadow-soft-sm`, `shadow-soft-md`, `shadow-soft-lg`                            |
| Radii                        | `rounded-token`, `rounded-token-sm`, `rounded-token-lg`                         |
