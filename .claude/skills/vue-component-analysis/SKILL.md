---
name: vue-component-analysis
description: Analyze Vue 3 single-file components for structure, performance and reuse problems and suggest concrete optimizations. Use when asked to review, audit, analyze or optimize a .vue file or the views/components folders, or to find duplicated logic between components.
---

# Vue component analysis

Analyze one component, a folder, or the whole `client/src` tree and report findings ranked by impact. This skill **reports and suggests**; it only edits code when the user asks for the fixes.

## Scope

- Single file: the path given.
- Default (no path): `client/src/views/*.vue` and `client/src/components/*.vue`.

## Checklist (run every check per file)

**Structure**
1. API style: Composition API `setup()` as required by `client/CLAUDE.md` — flag Options API (`data()`, `methods`, `mounted`).
2. Size: template > 100 lines or script > 150 lines → suggest extracting a child component or composable.
3. Data access goes through `src/api.js` — flag direct `axios` calls and hard-coded URLs.
4. Shared state uses composables (`useFilters`, `useI18n`, `useAuth`) — flag local copies of global state.
5. i18n: every user-visible string uses `t()`; keys exist in **both** `locales/en.js` and `locales/ja.js`.

**Performance / reactivity**
6. Functions called from the template that loop over data (O(n) per row → O(n²) render) → move to a `computed`.
7. Derived values stored in `ref`s and recalculated manually → `computed`.
8. `v-for` keyed by index → stable id (`sku`, `id`, `month`, …).
9. `console.log` in render paths or loaders.
10. Missing `watch` on global filters for views that show filtered data.
11. `v-if` on frequently toggled UI → `v-show`.
12. Unvalidated dates before `getMonth()` etc.

**Reuse**
13. Duplicated helpers across files (currency/number/date formatting, status → badge class maps, filter param building). Compare against `utils/currency.js`, `api.js`, existing composables.
14. Near-identical markup blocks (stat cards, tables, modals) that could become one component with props.

## How to run

1. List target files with line counts (`wc -l`).
2. For each file, grep for quick signals first: `data()`, `methods:`, `axios`, `console.`, `:key="index"`, `:key="i"`, hard-coded English text in templates (`>[A-Z][a-z]+ [a-z]`).
3. Read the flagged files and confirm each signal — no finding without a line reference.
4. For reuse checks, grep for duplicated function names / bodies across files.

## Report format

```
## <file> — <n> findings
| # | Severity | Line | Finding | Suggested change |
|---|----------|------|---------|------------------|
| 1 | high     | 42   | getBarHeight() loops all months per bar (O(n²)) | computed maxRevenue + precomputed rows |
```

Severity: **high** = wrong behaviour or visible perf cost; **medium** = convention break / maintainability; **low** = style.

End with a short **Cross-file reuse** section and the top 3 changes worth doing first.
