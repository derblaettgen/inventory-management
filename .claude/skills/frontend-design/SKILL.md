---
name: frontend-design
description: Redesign a Vue 3 application's UI into a modern SaaS-style interface — vertical navigation sidebar on the left instead of a top nav bar, consistent spacing, clean card layouts and a polished professional look. Use when asked to redesign, modernize or "make it look like a SaaS app", or to move navigation into a sidebar.
---

# Frontend design: SaaS-style redesign for Vue 3

Turn a top-nav Vue 3 app into a modern SaaS layout without changing behaviour, routes or data flow.

## Layout target

```
┌──────────┬───────────────────────────────────────────┐
│ Logo     │ Topbar: page title · language · profile    │
│          ├───────────────────────────────────────────┤
│ Nav      │ Filter bar (sticky)                        │
│  icon+lbl├───────────────────────────────────────────┤
│  …       │ Main content (max-width, generous padding) │
│          │                                           │
│ Collapse │                                           │
└──────────┴───────────────────────────────────────────┘
```

- **Sidebar**: fixed, full height, 248px wide; collapses to a 72px icon-only rail. Collapse state is user-toggleable, remembered in `localStorage` (wrapped in try/catch), and automatic below 1024px. Each nav item = inline SVG icon + label; in rail mode labels hide and become `title` tooltips. Active item: tinted background + accent bar on the left.
- **Topbar**: 70px, white, bottom border; shows the current page title on the left, utilities (language switcher, profile menu) on the right.
- **Content**: offset by the sidebar width (animate the offset), max-width ~1600px, 2rem padding.

## Design tokens

Define on `:root` in the global stylesheet (App.vue) and use them everywhere you touch:

| Token | Value |
|---|---|
| `--sidebar-bg` | `#0f172a` (slate-900) |
| `--sidebar-fg` / `--sidebar-muted` | `#e2e8f0` / `#94a3b8` |
| `--accent` / `--accent-soft` | `#2563eb` / `#eff6ff` |
| `--surface` / `--canvas` | `#ffffff` / `#f8fafc` |
| `--border` | `#e2e8f0` |
| `--radius` | `12px` |
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)` |
| spacing | 4px scale: .25 / .5 / .75 / 1 / 1.25 / 1.5 / 2 rem |

## Cards

`.card` and `.stat-card`: white surface, 1px border, `--radius`, `--shadow-sm`, hover raises the shadow slightly. Card headers keep a hairline divider. Never add emojis (project rule) — icons are inline SVG, `stroke="currentColor"`, 20px, `aria-hidden="true"`.

## Rules

1. Keep every route, `router-link`, component and event wiring intact — this is a visual change only.
2. Keep i18n: every visible label goes through `t()`; add missing keys to **all** locale files.
3. Respect project conventions in `client/CLAUDE.md` (Composition API, scoped styles for components, global styles in App.vue).
4. Sticky elements below the topbar (e.g. FilterBar) must still stick under it.
5. Accessibility: sidebar is a `<nav aria-label>`, the collapse button has `aria-expanded` and an `aria-label`, focus states are visible.
6. Verify in the browser (Playwright MCP if available): every page loads, sidebar collapses/expands, layout holds at 1440px and 900px.
