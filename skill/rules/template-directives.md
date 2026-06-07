# template-directives

**Impact: HIGH**

LWC introduced modern template directives in API version 58.0. The old `if:true` / `if:false` directives are deprecated. Always use `lwc:if` / `lwc:elseif` / `lwc:else` for conditionals and `for:each` with a `key` for loops.

> **Rule:**
>
> - Never use `if:true` or `if:false` — use `lwc:if` / `lwc:elseif` / `lwc:else`.
> - `lwc:elseif` and `lwc:else` must be **direct siblings** of `lwc:if` — no elements between them.
> - Always use `for:each` with a unique `key` on the **direct child element** — never on the `<template>` tag.
> - Never use array index as `key` — use a stable unique ID from the data.

---

## Case 1: Conditional rendering

**Incorrect — deprecated directives:**

```html
<template>
  <template if:true="{isLoading}">
    <lightning-spinner></lightning-spinner>
  </template>
  <template if:false="{isLoading}">
    <template if:true="{hasData}">
      <p>{appointment.Name}</p>
    </template>
  </template>
</template>
```

**Correct — modern directives:**

```html
<template>
  <template lwc:if="{isLoading}">
    <lightning-spinner></lightning-spinner>
  </template>

  <template lwc:elseif="{hasData}">
    <p>{appointment.Name}</p>
  </template>

  <template lwc:else>
    <p>No appointment found.</p>
  </template>
</template>
```

> ⚠️ **Sibling rule:** `lwc:elseif` / `lwc:else` must immediately follow `lwc:if` with no elements in between, or the chain breaks silently.
>
> ```html
> <!-- ❌ Breaks the chain — p element between if and elseif -->
> <template lwc:if="{condA}">...</template>
> <p>something</p>
> <template lwc:elseif="{condB}">...</template>
> ```

```typescript
// appointmentCard.ts
import { LightningElement, api, wire } from "lwc";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import NAME_FIELD from "@salesforce/schema/Appointment__c.Name";

// @ts-ignore
export default class AppointmentCard extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  isLoading: boolean = true;
  appointment: Record<string, unknown> | null = null;

  // @ts-ignore
  @wire(getRecord, { recordId: "$recordId", fields: [NAME_FIELD] })
  public handleRecord({ data, error }: { data?: Record<string, unknown>; error?: unknown }): void {
    this.isLoading = false;
    if (data) {
      this.appointment = data;
    }
  }

  public get hasData(): boolean {
    return !!this.appointment;
  }

  public get appointmentName(): string | null {
    return getFieldValue(this.appointment, NAME_FIELD) as string | null;
  }
}
```

---

## Case 2: Rendering a list with `for:each`

**Incorrect — `key` on `<template>` tag (ignored by LWC engine):**

```html
<!-- ❌ key on <template> is ignored -->
<template for:each="{appointments}" for:item="appt" key="{appt.Id}">
  <div>
    <p>{appt.Name}</p>
  </div>
</template>
```

**Incorrect — array index as key:**

```html
<!-- ❌ causes incorrect DOM reuse on reorder/remove -->
<template for:each="{appointments}" for:item="appt" for:index="idx">
  <div key="{idx}">
    <p>{appt.Name}</p>
  </div>
</template>
```

**Correct — `key` on the direct child element, using a stable record ID:**

```html
<template>
  <template for:each="{appointments}" for:item="appt">
    <div key="{appt.Id}">
      <p>{appt.Name}</p>
      <p>{appt.Status__c}</p>
    </div>
  </template>
</template>
```

```typescript
// appointmentList.ts
import { LightningElement, api, wire } from "lwc";
import getAppointments from "@salesforce/apex/AppointmentController.getAppointments";

interface AppointmentRecord {
  Id: string;
  Name: string;
  Status__c: string;
  IsUrgent__c: boolean;
}

// @ts-ignore
export default class AppointmentList extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  // @ts-ignore
  @wire(getAppointments, { recordId: "$recordId" })
  appointments: { data?: AppointmentRecord[]; error?: unknown };
}
```

---

## Case 3: Conditional rendering inside a loop

```html
<template>
  <template for:each="{appointments.data}" for:item="appt">
    <div key="{appt.Id}" class="slds-m-bottom_small">
      <p>{appt.Name}</p>

      <template lwc:if="{appt.IsUrgent__c}">
        <lightning-badge label="Urgent" class="slds-theme_error"></lightning-badge>
      </template>

      <template lwc:else>
        <lightning-badge label="Routine"></lightning-badge>
      </template>
    </div>
  </template>
</template>
```

---

## Quick Decision Guide

| Situation                       | Pattern                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| Show/hide one block             | `lwc:if`                                                    |
| if / else if / else             | `lwc:if` + `lwc:elseif` + `lwc:else` (direct siblings only) |
| Render a list                   | `for:each` + `key` on direct child element                  |
| Key value                       | Stable record ID — never array index                        |
| Conditional content inside loop | `lwc:if` inside `for:each`                                  |

---

**Reference:** [Render Lists — Salesforce LWC Developer Guide](https://developer.salesforce.com/docs/platform/lwc/guide/create-components-directives.html)
