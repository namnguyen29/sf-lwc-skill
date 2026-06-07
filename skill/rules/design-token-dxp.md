# design-token-dxp

**Impact: HIGH**

> ⚠️ **Runtime:** `--dxp` hooks are available in **LWR runtime only** (Experience Cloud LWR sites). They do not work in Aura runtime or standard Lightning pages.

Experience Cloud LWR sites expose `--dxp` CSS custom properties (styling hooks) that map directly to the Theme panel in Experience Builder. Using these hooks means a site admin can retheme the entire portal — colors, fonts, spacing — without a developer touching component CSS. Hardcoding values bypasses this system and causes visual regressions whenever the theme changes.

> **Rule:**
>
> - For typography in HTML templates, use `dxp-text-*` CSS classes (e.g. `dxp-text-heading-xlarge`).
> - For typography in component CSS, use `--dxp-s-text-*` hooks (e.g. `var(--dxp-s-text-heading-extra-large-font-size)`).
> - For colors, use `--dxp-g-*` global color hooks — never hardcode hex values.
> - For font-family and base font size overrides, use `--dxp-g-root-font-family` / `--dxp-g-heading-font-family`.
> - Define a `:root` block in **Head Markup** (Experience Builder → Settings → Advanced → Head Markup) for site-wide token overrides. Do not repeat overrides inside individual component CSS files.
> - Never use `--dxp-g-destructive` for brand colors — it is reserved for error/invalid states only.

---

## Typography — CSS Classes vs CSS Variables

Two ways to apply text styles. Use the class approach in HTML templates; use the variable approach when overriding in CSS.

### Heading classes & hooks

| Level       | HTML class                | CSS variable (font-size)                     | CSS variable (font-family)                     |
| ----------- | ------------------------- | -------------------------------------------- | ---------------------------------------------- |
| Extra Large | `dxp-text-heading-xlarge` | `--dxp-s-text-heading-extra-large-font-size` | `--dxp-s-text-heading-extra-large-font-family` |
| Large       | `dxp-text-heading-large`  | `--dxp-s-text-heading-large-font-size`       | `--dxp-s-text-heading-large-font-family`       |
| Medium      | `dxp-text-heading-medium` | `--dxp-s-text-heading-medium-font-size`      | `--dxp-s-text-heading-medium-font-family`      |
| Small       | `dxp-text-heading-small`  | `--dxp-s-text-heading-small-font-size`       | `--dxp-s-text-heading-small-font-family`       |
| X-Small     | `dxp-text-heading-xsmall` | `--dxp-s-text-heading-extra-small-font-size` | `--dxp-s-text-heading-extra-small-font-family` |

Each heading level also supports:

- `--dxp-s-text-heading-[level]-font-weight`
- `--dxp-s-text-heading-[level]-line-height`
- `--dxp-s-text-heading-[level]-color`

### Body / paragraph classes & hooks

| Level           | HTML class             | CSS variable (font-size)             |
| --------------- | ---------------------- | ------------------------------------ |
| Paragraph 1     | `dxp-text-body-large`  | `--dxp-s-text-body-large-font-size`  |
| Paragraph 2     | `dxp-text-body-medium` | `--dxp-s-text-body-medium-font-size` |
| Caption / small | `dxp-text-body-small`  | `--dxp-s-text-body-small-font-size`  |

Each body level also supports `--dxp-s-text-body-[level]-font-family` and `--dxp-s-text-body-[level]-line-height`.

---

## Color hooks

| Family            | Hook                                            | Use case                                    |
| ----------------- | ----------------------------------------------- | ------------------------------------------- |
| Root              | `--dxp-g-root`                                  | Page / section background                   |
| Root contrast     | `--dxp-g-root-contrast`                         | Text/icons on root background               |
| Root interaction  | `--dxp-g-root-1`                                | Hover state on root background              |
| Brand             | `--dxp-g-brand`                                 | Primary brand color (buttons, links, focus) |
| Brand contrast    | `--dxp-g-brand-contrast`                        | Text/icons on brand background              |
| Brand interaction | `--dxp-g-brand-1`                               | Hover state of brand elements               |
| Success           | `--dxp-g-success`                               | Success badges, alerts, toasts              |
| Destructive       | `--dxp-g-destructive`                           | Error / invalid states only                 |
| Warning           | `--dxp-g-warning`                               | Warning badges, alerts                      |
| Info              | `--dxp-g-info`                                  | Tooltips, popovers                          |
| Neutral           | `--dxp-g-neutral`                               | Borders, shadows, disabled inputs           |
| Neutral scale     | `--dxp-g-neutral-1` / `neutral-2` / `neutral-3` | Progressive neutral shades                  |

> ⚠️ `neutral`, `warning`, `info`, `success`, and `destructive` **cannot be configured in the Theme panel** — override them manually in Head Markup only.

> ⚠️ Always use the paired `*-contrast` hook for text/icons placed on a colored background to ensure accessible contrast ratios.

---

## Case 1: Hardcoded typography in HTML template

**Incorrect — custom class with hardcoded font-size breaks when theme changes:**

```html
<!-- appointmentCard.html -->
<!-- ❌ Custom class with hardcoded font-size — not tied to the site theme -->
<template>
  <h2 class="card-title">{appointment.Name}</h2>
  <p class="card-body">{appointment.Summary__c}</p>
</template>
```

```css
/* appointmentCard.css */
/* ❌ Hardcoded values — admin cannot update these from Theme panel */
.card-title {
  font-size: 18px;
  font-family: "Inter", sans-serif;
}
.card-body {
  font-size: 14px;
}
```

**Correct — use `dxp-text-*` classes in the template:**

```html
<!-- appointmentCard.html -->
<!-- ✅ dxp classes inherit from Theme panel — no CSS needed -->
<template>
  <h2 class="dxp-text-heading-medium">{appointment.Name}</h2>
  <p class="dxp-text-body-large">{appointment.Summary__c}</p>
</template>
```

```css
/* appointmentCard.css — ✅ empty for typography, only add non-text custom styles */
```

---

## Case 2: Typography override in component CSS

When a custom CSS class needs to match a text style (e.g. a dynamically styled element):

**Correct — use `--dxp-s-text-*` variables in CSS:**

```css
/* portalHero.css */
.hero-title {
  font-size: var(--dxp-s-text-heading-extra-large-font-size);
  font-family: var(--dxp-s-text-heading-extra-large-font-family);
  font-weight: var(--dxp-s-text-heading-extra-large-font-weight);
  color: var(--dxp-s-text-heading-extra-large-color);
}

.hero-subtitle {
  font-size: var(--dxp-s-text-body-large-font-size);
  line-height: var(--dxp-s-text-body-large-line-height);
  color: var(--dxp-g-root-contrast); /* ✅ contrast pair for root background */
}
```

---

## Case 3: Hardcoded color values

**Incorrect:**

```css
/* ❌ Hardcoded hex — breaks when brand color changes in Theme panel */
.cta-button {
  background-color: #0070d2;
  color: #ffffff;
}

/* ❌ Using destructive color for brand — wrong semantic */
.brand-badge {
  background-color: var(--dxp-g-destructive);
}
```

**Correct:**

```css
/* ✅ Uses brand hooks — updates automatically when admin changes theme */
.cta-button {
  background-color: var(--dxp-g-brand);
  color: var(--dxp-g-brand-contrast); /* ✅ always accessible on brand bg */
}

/* ✅ Correct semantic — destructive only for errors */
.error-badge {
  background-color: var(--dxp-g-destructive);
  color: var(--dxp-g-destructive-contrast);
}
```

---

## Case 4: Global `:root` override in Head Markup

Define site-wide token overrides once in Head Markup — not scattered across component CSS files.

**Incorrect — overriding tokens inside a component:**

```css
/* appointmentCard.css */
/* ❌ Only affects this component — leads to duplicated overrides everywhere */
:host {
  --dxp-g-heading-font-family: "Nunito", sans-serif;
  --dxp-g-brand: #005fbb;
}
```

**Correct — one `:root` block in Experience Builder → Settings → Advanced → Head Markup:**

```html
<!-- Head Markup -->
<style>
  :root {
    /* Base font */
    --dxp-g-root-font-family: "Nunito", "Salesforce Sans", arial, sans-serif;
    --dxp-g-heading-font-family: "Nunito", "Salesforce Sans", arial, sans-serif;

    /* Brand colors — configurable via Theme panel */
    --dxp-g-brand: #005fbb;
    --dxp-g-brand-contrast: #ffffff;

    /* Semantic colors — must be set here, not configurable in Theme panel */
    --dxp-g-success: #2e7d32;
    --dxp-g-warning: #e65100;
    --dxp-g-destructive: #c62828;
    --dxp-g-neutral: #e5e5e5;
  }
</style>
```

---

## Quick Decision Guide

| Need                         | Approach                                                          |
| ---------------------------- | ----------------------------------------------------------------- |
| Heading style in HTML        | `class="dxp-text-heading-{xlarge\|large\|medium\|small\|xsmall}"` |
| Body text in HTML            | `class="dxp-text-body-{large\|medium\|small}"`                    |
| Typography in component CSS  | `var(--dxp-s-text-heading-[level]-font-size)` etc.                |
| Brand / interaction color    | `var(--dxp-g-brand)` + `var(--dxp-g-brand-contrast)`              |
| Error state color            | `var(--dxp-g-destructive)` — not for brand use                    |
| Global font / color override | `:root {}` in Head Markup — not in component CSS                  |
| Hardcode a hex value         | ❌ Never                                                          |

---

**Reference:** [--dxp Styling Hooks](https://developer.salesforce.com/docs/atlas.en-us.exp_cloud_lwr.meta/exp_cloud_lwr/brand_hooks.htm) · [Text Hooks](https://developer.salesforce.com/docs/atlas.en-us.exp_cloud_lwr.meta/exp_cloud_lwr/brand_hooks_text.htm) · [Color Hooks](https://developer.salesforce.com/docs/atlas.en-us.exp_cloud_lwr.meta/exp_cloud_lwr/brand_hooks_color.htm)
