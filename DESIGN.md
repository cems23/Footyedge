---
version: alpha
name: "FootyEdge"
description: "A dark, live football intelligence product where numerical evidence stays more prominent than decoration."
colors:
  background: "#070d1a"
  surface: "#0d1e35"
  border: "#1a2e4a"
  primary: "#00c878"
  primary-muted: "#00a86b"
  text: "#e8eaf6"
  text-muted: "#6b8db5"
  warning: "#ffb400"
  info: "#64b5f6"
  danger: "#ff5555"
typography:
  display:
    fontFamily: '"Bebas Neue", sans-serif'
  body:
    fontFamily: '"DM Mono", "Courier New", monospace'
rounded:
  sm: "0.375rem"
  md: "0.75rem"
  lg: "1rem"
  pill: "999px"
spacing:
  page-x: "clamp(16px, 5vw, 64px)"
  card: "1.25rem"
  section: "clamp(48px, 7vw, 100px)"
components:
  button: {}
  card: {}
  metric: {}
  status: {}
---

# FootyEdge Design System

## Overview

### Creative North Star

An illuminated stadium tactics board: deep navy space, sharp monospace data labels and a single grass-green signal that says a number has passed a threshold.

### Product context and register

- **Audience and primary job:** Spanish- and English-speaking football-statistics users who need to assess a daily signal and its evidence quickly.
- **Target market(s) and evidence:** Global football audiences; the product ships Spanish and English routes and football competitions from Europe and the Americas.
- **Locale(s) and language policy:** `es` and `en`; all owned product copy follows the selected route locale. Dates use the locale while operational data remains time-sensitive.
- **Usage scene:** Mobile and desktop, often immediately before a fixture; information must remain dense but scannable.
- **Register:** Hybrid. Marketing can be atmospheric; the dashboard and admin routes prioritize calm operational clarity.
- **Memorable signature:** A green probability/edge signal against a restrained navy data field.
- **Restraint:** Performance metrics, statuses and warnings are never decorative or optimistic by default.
- **Anti-references:** Generic casino visuals, guaranteed-profit claims and bright competing gradients that hide data hierarchy.
- **Token ownership/runtime mapping:** Existing CSS variables in `src/app/globals.css` are canonical. This file mirrors their accepted values; the global stylesheet supplies runtime variables and all route components consume those values or the established palette.

## Colors

`background` and `surface` separate the page and its data panels. `primary` is reserved for positive/selected/confirmed signal states; it is not a generic accent. `warning`, `info` and `danger` preserve operational meaning, especially for data freshness and pipeline states. The dark theme is the only supported theme today.

## Typography

`display` is used for compact headings and large numerical moments. `body` is the durable monospace utility face for labels, tables and copy. Do not use display typography for dense explanatory paragraphs; use body text with readable line height.

## Layout

Page gutters use `spacing.page-x`; content panels keep `spacing.card`. Desktop data may use horizontal overflow only when columns must be compared. At narrow widths, actions remain visible, panels stack, and core match identifiers do not disappear.

## Elevation & Depth

Static cards use tonal separation and `border`, with modest shadows only to group interactive or featured panels. Sticky navigation must use an opaque/blurred background. Do not use glow to communicate an error or a legal warning.

## Shapes

Cards use `rounded.lg`; normal controls use `rounded.md`; filters and status chips use `rounded.pill`. Borders are thin and high enough contrast to preserve groupings on dark surfaces.

## Components

### Foundational visual states

Buttons and links have a visible gold focus ring. Loading reserves the panel footprint; unavailable data uses an inline recovery action instead of a blank space. Global scrollbars use the tokens in `globals.css`, including standards-based Firefox support and forced-color fallback.

### Buttons and actions

Primary actions are green and use explicit verbs. Secondary actions are transparent with a border. Warning and danger colors communicate state, never merely emphasis. Busy actions retain their geometry.

### Navigation and data display

Tabs, filters and status chips use the same navy surface and bordered-pill grammar. A coverage bar communicates observed model coverage, accompanied by its numeric count so color is never the only source of meaning.

### Content and data visualization

Use locale-aware time and percentages. Explain whether a number is a value-bet ROI metric or a probability-only hit rate; never merge the two into a single performance claim.

## Do's and Don'ts

- **Do:** make freshness, sample size, coverage and uncertainty visible alongside model performance.
- **Do:** reserve green for an active or confirmed positive state.
- **Don't:** treat provider credentials as proof that a provider is currently reachable.
- **Don't:** imply that an estimated probability guarantees a result.
