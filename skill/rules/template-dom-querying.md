# template-dom-querying

**Impact: HIGH**

DOM querying in LWC is scoped to `this.template`. You cannot reach into a child component's DOM from a parent — attempting to do so always returns `null`.

> **Rule:**
>
> - Always use `data-id` attributes as query selectors — never class names or tag names.
> - `this.template.querySelector` is safe inside event handlers and `renderedCallback` — **not** in `connectedCallback`.
> - Never query DOM across component boundaries. Expose `@api` methods on children instead.

---

## Case 1: Querying across component boundaries

**Incorrect — parent queries into child's shadow DOM (always returns null):**

```typescript
// patientOnboarding.ts
import { LightningElement } from "lwc";

// @ts-ignore
export default class PatientOnboarding extends LightningElement {
  currentStep: number = 1;

  public handleNext(): void {
    // ❌ Always returns null — shadow DOM blocks cross-component queries
    const input = this.template.querySelector("c-patient-onboarding-step1 lightning-input");
    if (!input) return;
    this.currentStep = 2;
  }
}
```

**Correct — parent calls `@api` method on child, child validates its own DOM:**

```typescript
// patientOnboardingStep1.ts
import { LightningElement, api } from "lwc";

// @ts-ignore
export default class PatientOnboardingStep1 extends LightningElement {
  // @ts-ignore
  @api
  public validate(): boolean {
    const inputs = this.template.querySelectorAll<HTMLInputElement>("lightning-input");
    return [...inputs].reduce((isValid, input) => {
      input.reportValidity();
      return isValid && input.checkValidity();
    }, true);
  }
}
```

```typescript
// patientOnboarding.ts
import { LightningElement } from "lwc";

interface StepComponent extends HTMLElement {
  validate(): boolean;
}

// @ts-ignore
export default class PatientOnboarding extends LightningElement {
  currentStep: number = 1;

  public get isStep1(): boolean {
    return this.currentStep === 1;
  }
  public get isStep2(): boolean {
    return this.currentStep === 2;
  }

  public handleNext(): void {
    const stepComponent = this.template.querySelector<StepComponent>('[data-id="current-step"]');
    if (!stepComponent) return;

    // ✅ Child validates itself — parent only asks for the result
    if (!stepComponent.validate()) return;

    this.currentStep += 1;
  }

  public handlePrev(): void {
    this.currentStep -= 1;
  }
}
```

```html
<!-- patientOnboarding.html -->
<template>
  <template lwc:if="{isStep1}">
    <c-patient-onboarding-step1 data-id="current-step"></c-patient-onboarding-step1>
  </template>
  <template lwc:if="{isStep2}">
    <c-patient-onboarding-step2 data-id="current-step"></c-patient-onboarding-step2>
  </template>
  <div>
    <lightning-button label="Back" onclick="{handlePrev}"></lightning-button>
    <lightning-button variant="brand" label="Next" onclick="{handleNext}"></lightning-button>
  </div>
</template>
```

> `data-id="current-step"` stays the same across all steps — parent always queries the same selector.

---

## Case 2: Class/tag selectors instead of `data-id`

**Incorrect — fragile selectors tied to implementation details:**

```typescript
// bookingForm.ts
handleSubmit(event: Event): void {
    event.preventDefault();
    // ❌ Breaks if class name changes or element type is swapped
    const input = this.template.querySelector<HTMLInputElement>('.date-input');
}
```

**Correct — stable `data-id` selectors:**

```typescript
// bookingForm.ts
import { LightningElement } from "lwc";

// @ts-ignore
export default class BookingForm extends LightningElement {
  public handleSubmit(event: Event): void {
    event.preventDefault();

    const dateInput = this.template.querySelector<HTMLInputElement>('[data-id="date-input"]');
    const timeInput = this.template.querySelector<HTMLInputElement>('[data-id="time-input"]');

    if (!dateInput || !timeInput) return;

    if (!dateInput.checkValidity() || !timeInput.checkValidity()) {
      dateInput.reportValidity();
      timeInput.reportValidity();
      return;
    }

    this.submitBooking();
  }

  private submitBooking(): void {
    // submit logic
  }
}
```

```html
<!-- bookingForm.html -->
<template>
  <form onsubmit="{handleSubmit}">
    <lightning-input data-id="date-input" name="date" type="date" label="Appointment Date" required></lightning-input>
    <lightning-input data-id="time-input" name="time" type="time" label="Appointment Time" required></lightning-input>
    <lightning-button type="submit" variant="brand" label="Book"></lightning-button>
  </form>
</template>
```

---

## Case 3: Querying multiple elements with `querySelectorAll`

```typescript
// patientOnboardingStep2.ts
import { LightningElement, api } from "lwc";

// @ts-ignore
export default class PatientOnboardingStep2 extends LightningElement {
  // @ts-ignore
  @api
  public validate(): boolean {
    const allInputs = this.template.querySelectorAll<HTMLInputElement>("lightning-input, lightning-textarea");
    return [...allInputs].reduce((isValid, input) => {
      input.reportValidity();
      return isValid && input.checkValidity();
    }, true);
  }
}
```

---

## Quick Decision Guide

| Situation                              | Pattern                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| Query element in the same component    | `this.template.querySelector<T>('[data-id="x"]')`            |
| Safe timing for querySelector          | Event handlers, `renderedCallback` — not `connectedCallback` |
| Trigger behavior in a child            | Expose `@api` method on child, call from parent              |
| Validate all inputs in a form          | `querySelectorAll('lightning-input')` + `reduce`             |
| Query child's internal DOM from parent | ❌ Not possible — Shadow DOM blocks it                       |

---

**Reference:** [Access Elements the Component Owns — Salesforce LWC Developer Guide](https://developer.salesforce.com/docs/platform/lwc/guide/create-components-dom-work.html)
