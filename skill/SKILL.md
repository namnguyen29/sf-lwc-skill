---
name: fe-lwc
description: Generate Lightning Web Components (LWC) for Salesforce Experience Cloud portals and Lightning App Builder, following scalable architecture, performance optimization, and Salesforce platform best practices.
---

# LWC Frontend Development

Before writing any LWC code, you MUST read the relevant rule files below.

## Rules & Patterns

### Always read these first:

- Read `rules/design-token-dxp.md` and `rules/design-token-slds.md` before any UI styling
- Read `rules/data-lds-first.md` before any data fetching
- Read `rules/template-form-pattern.md` before building forms
- **Creating a new LWC?** Always scaffold with the CLI first — replace `<componentName>` with the actual component name from the prompt:
  ```bash
  sf lightning generate component --type lwc --name <componentName> --output-dir force-app/main/default/lwc
  ```
- For every TypeScript LWC component created, always add a .gitignore entry for the generated JavaScript file.

### Read based on task:

- Wire vs imperative: read `rules/data-wire-vs-imperative.md`
- Custom events: read `rules/events-custom-event.md`
- LMS: read `rules/events-lms.md`
- Template directives: read `rules/template-directives.md`
- DOM querying: read `rules/template-dom-querying.md`
- Track/immutable: read `rules/template-track-immutable.md`
- Error handling: read `rules/data-error-handling.md`

---

# When to Apply

Reference these guidelines when:

- Writing a new LWC component for an **Experience Cloud portal** (LWR runtime)
- Writing a custom component for a **Salesforce Lightning App** (App Builder)
- Implementing data fetching with `@wire` or imperative Apex calls
- Reviewing or refactoring existing LWC code for consistency and performance

---

# Core Principles

All Lightning Web Components should follow these engineering principles to ensure scalability, maintainability, and platform consistency.

- **LDS First** — Prefer Lightning Data Service (`lightning/uiRecordApi`) for standard CRUD operations before writing Apex controllers.
- **LWR Optimized** — Components must be optimized for Lightning Web Runtime (LWR).
- **Platform Native First** — Always prefer standard Salesforce capabilities before implementing custom solutions.
- **Performance Focused** — Avoid unnecessary re-renders, excessive DOM queries, and large reactive states.

---

# Quick Reference

## Data Patterns

| Rule                      | Description                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `data-lds-first`          | Use `lightning/uiRecordApi` for standard CRUD before reaching for Apex                                              |
| `data-wire-vs-imperative` | Use `@wire` for declarative data binding; use imperative calls when you need explicit control (e.g. on user action) |
| `data-error-handling`     | Always handle wire/Apex errors using the `reduceErrors` utility; never silently swallow errors                      |

## Template Standards

| Rule                       | Description                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `template-directives`      | Use `lwc:if` / `lwc:elseif` / `lwc:else` / `for:each` + `for:item` — never the deprecated `if:true` / `if:false` |
| `template-track-immutable` | Avoid unnecessary `@track`; trigger reactivity through immutable updates (`[...arr]`, `{...obj}`)                |
| `template-form-pattern`    | Use a single `handleChange` method keyed on `event.target.name`; keep form state in one object                   |
| `template-dom-querying`    | Target elements with `data-id` attributes and `this.template.querySelector()`; avoid class/tag selectors         |

## Component Communication

| Rule                  | Description                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `events-custom-event` | Dispatch custom events with explicit `bubbles` and `composed` flags; use kebab-case or camelCase event names                                  |
| `events-lms`          | Use Lightning Message Service (LMS) for cross-region communication on App Builder and Experience Cloud pages; avoid direct component coupling |

## Design System

| Rule                | Description                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design-token-dxp`  | Use `dxp-text-*` classes for typography in HTML templates, `--dxp-s-text-*` hooks in component CSS, and `--dxp-g-*` color hooks — never hardcode hex values; define site-wide overrides in Head Markup `:root` only |
| `design-token-slds` | Apply SLDS utility classes for spacing and layout before writing any custom CSS                                                                                                                                     |
