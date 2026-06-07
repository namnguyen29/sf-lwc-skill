# design-token-slds

**Impact: MEDIUM**

SLDS (Salesforce Lightning Design System) provides a comprehensive set of utility classes for layout, spacing, typography, and borders. Using SLDS utilities keeps component CSS files minimal and ensures visual consistency with the rest of the Salesforce platform. Writing custom CSS for things SLDS already handles wastes time and creates maintenance debt.

> **Rule:**
>
> - Reach for SLDS utility classes before writing any custom CSS.
> - **Never write `display: flex`, `flex-direction`, `align-items`, or `gap` in CSS** — use `slds-grid` and its modifier classes instead. If you find yourself writing flexbox CSS, stop and look up the SLDS equivalent first.
> - Use `slds-m-*` and `slds-p-*` for margins and padding before setting them in CSS.
> - Use `slds-border_*` for borders; `slds-text-*` for typography utilities.
> - Write custom CSS only when SLDS utilities genuinely cannot cover the requirement.
> - Never override SLDS utility classes with `!important` — this creates specificity debt.

---

## Project CSS Variables

Before writing any custom CSS value (color, font, spacing), read **both** project config files below. Replace `<site-name>` with the actual portal folder name found under `digitalExperiences/site/`.

**1. Branding tokens** — colors, fonts, and spacing variables:

```
force-app/main/default/digitalExperiences/site/<site-name>/sfdc_cms__brandingSet/Build_Your_Own_LWR/content.json
```

**2. App page layout config** — page-level CSS variables and region settings:

```
force-app/main/default/digitalExperiences/site/<site-name>/sfdc_cms__appPage/mainAppPage/content.json
```

> ⚠️ **Important — read `headMarkup` key first.** This file contains a `headMarkup` key that holds a `<style>` block injected into the site's `<head>`. This is where site-wide CSS variable overrides live — values here take precedence over component-level CSS and branding tokens. Before writing any CSS override, check `headMarkup` to see if the variable is already defined there. If you need to override a CSS variable globally, add it to `headMarkup`, not inside a component's `.css` file.

The `contentBody.values` node in the branding file contains all design tokens for the site. Keys map to `--dxp-*` CSS custom properties at runtime. Always use the corresponding `--dxp-*` variable in component CSS — never hardcode the raw value.

Example — given this branding file structure:

```json
{
  "contentBody": {
    "values": {
      "ButtonColor": "var(--dxp-g-brand)",
      "ButtonBorderRadius": "0px",
      "ButtonFontWeight": "500",
      "FormElementBorderColor": "rgb(155, 155, 155)",
      "FormElementBorderRadius": "8px",
      "HeadingLargeFontSize": "1.625rem",
      "HeadingLargeFontWeight": "700",
      "BodyFontSize": "1rem",
      "BodyLineHeight": "1.4",
      "BackgroundColor": "rgb(255, 255, 255)"
    }
  }
}
```

Then in component CSS use the corresponding `--dxp-*` hooks — **never** the raw values:

```css
/* ✅ correct — uses dxp hooks that map to the branding values above */
.cta-button {
  background-color: var(--dxp-g-brand); /* ButtonColor */
  border-radius: var(--dxp-s-button-sizing-border-radius); /* ButtonBorderRadius */
  font-weight: var(--dxp-s-button-text-font-weight); /* ButtonFontWeight */
}

.form-input {
  border-color: var(--dxp-s-form-element-color-border); /* FormElementBorderColor */
  border-radius: var(--dxp-s-form-element-sizing-border-radius); /* FormElementBorderRadius */
}

.section-heading {
  font-size: var(--dxp-s-text-heading-large-font-size); /* HeadingLargeFontSize */
  font-weight: var(--dxp-s-text-heading-large-font-weight); /* HeadingLargeFontWeight */
}

/* ❌ never hardcode raw values from contentBody.values */
.cta-button {
  background-color: #005fbb; /* ❌ */
  border-radius: 0px; /* ❌ */
}
.form-input {
  border-color: rgb(155, 155, 155); /* ❌ */
  border-radius: 8px; /* ❌ */
}
```

---

## Case 1: Custom layout instead of `slds-grid`

**Incorrect — custom flexbox reimplements what SLDS already provides:**

```html
<!-- appointmentList.html -->
<!-- ❌ Custom CSS class for a standard flex row layout -->
<template>
  <div class="card-row">
    <div class="card-col-left">
      <p>{appointment.Name}</p>
    </div>
    <div class="card-col-right">
      <p>{appointment.Date__c}</p>
    </div>
  </div>
</template>
```

```css
/* appointmentList.css — ❌ NEVER write layout CSS like this */
.card-row {
  display: flex; /* ❌ use slds-grid */
  flex-direction: row; /* ❌ default for slds-grid */
  align-items: center; /* ❌ use slds-grid_vertical-align-center */
  gap: 1rem; /* ❌ use slds-m-* on children instead */
}
.card-col-left {
  flex: 1; /* ❌ use slds-col */
}
.card-col-right {
  flex: 0 0 auto; /* ❌ use slds-shrink-none */
}
```

**Correct — use `slds-grid` utilities:**

```html
<!-- appointmentList.html -->
<!-- ✅ SLDS handles the layout — no custom CSS needed -->
<template>
  <div class="slds-grid slds-grid_align-spread slds-grid_vertical-align-center">
    <div class="slds-col">
      <p>{appointment.Name}</p>
    </div>
    <div class="slds-col slds-shrink-none">
      <p>{appointment.Date__c}</p>
    </div>
  </div>
</template>
```

```css
/* appointmentList.css — ✅ empty, or contains only non-layout custom styles */
```

### Common layout patterns → SLDS translation

| What Figma shows           | CSS you would write ❌                        | SLDS equivalent ✅                          |
| -------------------------- | --------------------------------------------- | ------------------------------------------- |
| Row, space between         | `display:flex; justify-content:space-between` | `slds-grid slds-grid_align-spread`          |
| Row, centered vertically   | `display:flex; align-items:center`            | `slds-grid slds-grid_vertical-align-center` |
| Column stack               | `display:flex; flex-direction:column`         | `slds-grid slds-grid_vertical`              |
| Item takes remaining space | `flex: 1`                                     | `slds-col`                                  |
| Item fixed width           | `flex: 0 0 auto`                              | `slds-shrink-none`                          |
| Gap between items          | `gap: 0.5rem`                                 | `slds-m-right_small` on each child          |
| Wrap to next line          | `flex-wrap: wrap`                             | `slds-wrap` on `slds-grid`                  |

---

## Case 2: Custom spacing instead of `slds-m-*` / `slds-p-*`

**Incorrect — hardcoded margin/padding in CSS:**

```html
<!-- patientCard.html -->
<template>
  <div class="card-wrapper">
    <h2 class="card-heading">{patient.Name}</h2>
    <p class="card-body">{patient.Summary__c}</p>
  </div>
</template>
```

```css
/* patientCard.css — ❌ custom spacing that duplicates SLDS scale */
.card-wrapper {
  padding: 16px;
  margin-bottom: 12px;
}
.card-heading {
  margin-bottom: 8px;
}
```

**Correct — SLDS spacing utilities on the element directly:**

```html
<!-- patientCard.html -->
<!-- ✅ Spacing handled in markup — CSS file stays clean -->
<template>
  <div class="slds-p-around_medium slds-m-bottom_small">
    <h2 class="slds-m-bottom_x-small">{patient.Name}</h2>
    <p>{patient.Summary__c}</p>
  </div>
</template>
```

---

## Case 3: Custom border instead of `slds-border_*`

**Incorrect:**

```css
/* ❌ Custom border — not consistent with SLDS visual language */
.status-badge {
  border: 1px solid #dddbda;
  border-radius: 4px;
}
```

**Correct:**

```html
<!-- ✅ SLDS utility class -->
<span class="slds-border_bottom slds-p-bottom_xxx-small">{status}</span>
```

---

## SLDS utilities quick reference

| Need                  | SLDS class                                        |
| --------------------- | ------------------------------------------------- |
| Flex row              | `slds-grid`                                       |
| Flex column           | `slds-grid slds-grid_vertical`                    |
| Grow column           | `slds-col`                                        |
| Fixed-size column     | `slds-shrink-none`                                |
| Align items center    | `slds-grid_vertical-align-center`                 |
| Justify space-between | `slds-grid_align-spread`                          |
| Margin (all sides)    | `slds-m-around_{size}`                            |
| Margin (directional)  | `slds-m-top_{size}`, `slds-m-bottom_{size}`, etc. |
| Padding (all sides)   | `slds-p-around_{size}`                            |
| Padding (directional) | `slds-p-top_{size}`, `slds-p-bottom_{size}`, etc. |
| Border                | `slds-border_{top\|bottom\|left\|right}`          |
| Truncate text         | `slds-truncate`                                   |
| Screen reader only    | `slds-assistive-text`                             |

> **Size tokens:** `xxx-small`, `xx-small`, `x-small`, `small`, `medium`, `large`, `x-large`, `xx-large`

---

## When to write custom CSS

Write custom CSS only when SLDS and `--dxp` hooks cannot cover the requirement:

- Component-specific visual states not in SLDS (e.g. custom progress indicator)
- Animations and transitions
- CSS Grid layouts beyond what `slds-grid` supports
- Overriding a third-party component's style via `::part()` or `:host`

In all other cases, default to SLDS utilities first.

---

**Reference:** [SLDS Utility Classes](https://www.lightningdesignsystem.com/utilities/alignment/) · [SLDS Grid System](https://www.lightningdesignsystem.com/utilities/grid/)
