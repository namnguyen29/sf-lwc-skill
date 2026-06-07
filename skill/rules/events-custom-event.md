# events-custom-event

**Impact: HIGH**

Custom events are the standard mechanism for child-to-parent communication in LWC. Two boolean flags — `bubbles` and `composed` — control how far an event travels through the DOM.

> **Rule:**
>
> - Always declare `bubbles` and `composed` explicitly.
> - Prefer **kebab-case** event names (`step-completed`) — camelCase is valid but less portable across some platforms.
> - The template handler attribute is always `on` + the full event name: `onstep-completed` or `onstepcompleted`.
> - Pass data through `detail`, not as top-level properties on the event object.
> - Keep `composed: true` only when the listener lives outside the component's shadow root.

---

## Decision Guide: `bubbles` and `composed`

| Listener location                                          | `bubbles`           | `composed` |
| ---------------------------------------------------------- | ------------------- | ---------- |
| Direct parent only                                         | `false`             | `false`    |
| Any ancestor in the same shadow tree                       | `true`              | `false`    |
| Outside the shadow root (cross-shadow, App Builder region) | `true`              | `true`     |
| Cross-region on Experience Cloud                           | Use **LMS** instead | —          |

---

## Case 1: Missing flags, data not in `detail`

**Incorrect:**

```typescript
// appointmentCard.ts
import { LightningElement, api } from "lwc";

// @ts-ignore
export default class AppointmentCard extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  public handleCancel(): void {
    // ❌ No bubbles/composed, data not in detail
    const event = new CustomEvent("appointmentCancelled", {
      appointmentId: this.recordId,
      reason: "User cancelled",
    } as CustomEventInit);
    this.dispatchEvent(event);
  }
}
```

**Correct — explicit flags, data in `detail`:**

```typescript
// appointmentCard.ts
import { LightningElement, api } from "lwc";

interface AppointmentCancelledDetail {
  appointmentId: string;
  reason: string;
}

// @ts-ignore
export default class AppointmentCard extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  public handleCancel(): void {
    this.dispatchEvent(
      new CustomEvent<AppointmentCancelledDetail>("appointmentCancelled", {
        bubbles: false, // ✅ explicit — direct parent is the listener
        composed: false, // ✅ explicit — same shadow root
        detail: {
          appointmentId: this.recordId,
          reason: "User cancelled",
        },
      }),
    );
  }
}
```

```typescript
// parentContainer.ts
import { LightningElement } from "lwc";

interface AppointmentCancelledDetail {
  appointmentId: string;
  reason: string;
}

// @ts-ignore
export default class ParentContainer extends LightningElement {
  public handleCancel(event: CustomEvent<AppointmentCancelledDetail>): void {
    const { appointmentId, reason } = event.detail;
    // handle cancellation...
  }
}
```

```html
<!-- parentContainer.html -->
<c-appointment-card onappointmentcancelled="{handleCancel}"></c-appointment-card>
```

---

## Case 2: Event must bubble through multiple ancestors

Scenario: `appointmentStep` → `appointmentWizard` → `appointmentModal`. The modal is the listener.

**Incorrect — `bubbles: false` stops the event at the direct parent:**

```typescript
// appointmentStep.ts
handleNext(): void {
    this.dispatchEvent(
        new CustomEvent('step-completed', {
            bubbles: false,  // ❌ stops at appointmentWizard
            composed: false,
            detail: { stepIndex: this.currentStep },
        })
    );
}
```

**Correct:**

```typescript
// appointmentStep.ts
import { LightningElement } from "lwc";

interface StepCompletedDetail {
  stepIndex: number;
}

// @ts-ignore
export default class AppointmentStep extends LightningElement {
  currentStep: number = 0;

  public handleNext(): void {
    this.dispatchEvent(
      new CustomEvent<StepCompletedDetail>("step-completed", {
        bubbles: true, // ✅ travels up to appointmentModal
        composed: false, // ✅ still within the same shadow root
        detail: { stepIndex: this.currentStep },
      }),
    );
  }
}
```

```typescript
// appointmentModal.ts
import { LightningElement } from "lwc";

// @ts-ignore
export default class AppointmentModal extends LightningElement {
  currentStep: number = 0;

  public handleStepCompleted(event: CustomEvent<{ stepIndex: number }>): void {
    this.currentStep = event.detail.stepIndex + 1;
  }
}
```

---

## Case 3: `composed: true` when crossing shadow roots (slotted content)

**Incorrect:**

```typescript
// slottedForm.ts
handleSubmit(): void {
    this.dispatchEvent(
        new CustomEvent('form-submitted', {
            bubbles: true,
            composed: false, // ❌ cannot cross the shadow root boundary
            detail: { formData: this.formState },
        })
    );
}
```

**Correct:**

```typescript
// slottedForm.ts
import { LightningElement } from "lwc";

interface FormSubmittedDetail {
  formData: Record<string, string>;
}

// @ts-ignore
export default class SlottedForm extends LightningElement {
  formState: Record<string, string> = {};

  public handleSubmit(): void {
    this.dispatchEvent(
      new CustomEvent<FormSubmittedDetail>("form-submitted", {
        bubbles: true,
        composed: true, // ✅ crosses the shadow boundary to the slot host
        detail: { formData: this.formState },
      }),
    );
  }
}
```

---

## Quick Decision Guide

| Situation                                          | Pattern                                                        |
| -------------------------------------------------- | -------------------------------------------------------------- |
| Child notifies direct parent                       | `bubbles: false`, `composed: false`                            |
| Child notifies distant ancestor (same shadow tree) | `bubbles: true`, `composed: false`                             |
| Slotted component notifies slot host               | `bubbles: true`, `composed: true`                              |
| Cross-region on App Builder / Experience Cloud     | Use **LMS**                                                    |
| Event name                                         | Prefer kebab-case; handler is `on` + name, all lowercase       |
| Payload                                            | Always in **`detail`** — typed with a generic `CustomEvent<T>` |

---

**Reference:** [Create and Dispatch Events — Salesforce LWC Developer Guide](https://developer.salesforce.com/docs/platform/lwc/guide/events-create-dispatch.html)
