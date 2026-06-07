# data-error-handling

**Impact: HIGH**

Unhandled errors are the most common silent failure in LWC. In LWC, `@wire` errors were frequently ignored — the component simply rendered nothing, leaving the user with a blank screen and no explanation. This rule covers how to handle errors consistently across wire adapters, imperative Apex calls, and form validation.

> **Rule:**
>
> - Always check `error` on every `@wire` result — never assume `data` is always present.
> - Handle the loading state too — when both `data` and `error` are `undefined`, the wire is still pending.
> - Use `reduceErrors` to extract readable messages from any Salesforce error shape.
> - Show a **toast** for Apex/server errors.
> - Show **inline messages** for form validation errors.

---

## The `reduceErrors` utility

Salesforce errors can come in many shapes — a wire `FetchResponse`, an imperative `AuraHandledException`, or a list of field-level errors from `createRecord`. `reduceErrors` normalizes all of them into a simple string array.

Copy this utility once into your project at `lwc/utils/errorUtils.ts`:

```typescript
// utils/errorUtils.ts

interface SalesforceError {
  body?: { message?: string } | Array<{ message: string }>;
  message?: string;
  statusText?: string;
}

/**
 * Reduces one or more LDS errors into a string array of error messages.
 */
export function reduceErrors(errors: SalesforceError | SalesforceError[]): string[] {
  if (!Array.isArray(errors)) {
    errors = [errors];
  }

  return errors
    .filter(Boolean)
    .map((error) => {
      if (Array.isArray(error.body)) {
        return error.body.map((e) => e.message);
      }
      if (error.body && typeof error.body.message === "string") {
        return error.body.message;
      }
      if (typeof error.message === "string") {
        return error.message;
      }
      return error.statusText ?? "Unknown error";
    })
    .reduce<string[]>((acc, val) => acc.concat(val), [])
    .filter((message): message is string => !!message);
}
```

---

## Case 1: Ignoring `@wire` errors (and missing loading state)

**Incorrect — blank screen when wire fails; no loading state:**

```typescript
// patientSummary.ts
import { LightningElement, api, wire } from "lwc";
import getPatientSummary from "@salesforce/apex/PatientController.getPatientSummary";

// @ts-ignore — decorator typing limitation in current Developer Preview
export default class PatientSummary extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  // @ts-ignore
  @wire(getPatientSummary, { recordId: "$recordId" })
  summary: { data?: PatientSummary; error?: unknown };

  // summary.error is never checked
  // loading state (data === undefined && error === undefined) never handled
}
```

**Correct — handle loading, data, and error states:**

```typescript
// patientSummary.ts
import { LightningElement, api, wire } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getPatientSummary from "@salesforce/apex/PatientController.getPatientSummary";
import { reduceErrors } from "c/utils";

interface PatientSummaryRecord {
  Name: string;
}

// @ts-ignore
export default class PatientSummary extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  summary: PatientSummaryRecord | null = null;
  isLoading: boolean = true;

  // @ts-ignore
  @wire(getPatientSummary, { recordId: "$recordId" })
  public handleSummary({ data, error }: { data?: PatientSummaryRecord; error?: unknown }): void {
    this.isLoading = false;
    if (data) {
      this.summary = data;
    } else if (error) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Error loading patient",
          message: reduceErrors(error).join(", "),
          variant: "error",
        }),
      );
    }
  }
}
```

```html
<!-- patientSummary.html -->
<template>
  <template lwc:if="{isLoading}">
    <lightning-spinner alternative-text="Loading"></lightning-spinner>
  </template>

  <template lwc:elseif="{summary}">
    <p>{summary.Name}</p>
  </template>

  <template lwc:else>
    <p>No patient data available.</p>
  </template>
</template>
```

---

## Case 2: Imperative Apex call without error handling

**Incorrect — no try/catch, unhandled promise rejection:**

```typescript
// appointmentSearch.ts
import { LightningElement } from "lwc";
import searchAppointments from "@salesforce/apex/AppointmentController.searchAppointments";

// @ts-ignore
export default class AppointmentSearch extends LightningElement {
  appointments: unknown[] = [];

  public async handleSearch(): Promise<void> {
    // If this throws, nothing catches it — silent failure.
    this.appointments = await searchAppointments({ term: this.searchTerm });
  }
}
```

**Correct — try/catch with toast on error:**

```typescript
// appointmentSearch.ts
import { LightningElement } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import searchAppointments from "@salesforce/apex/AppointmentController.searchAppointments";
import { reduceErrors } from "c/utils";

interface AppointmentRecord {
  Id: string;
  Name: string;
}

// @ts-ignore
export default class AppointmentSearch extends LightningElement {
  searchTerm: string = "";
  appointments: AppointmentRecord[] = [];
  isLoading: boolean = false;

  public handleChange(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  public async handleSearch(): Promise<void> {
    this.isLoading = true;
    try {
      this.appointments = await searchAppointments({ term: this.searchTerm });
    } catch (error) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Search failed",
          message: reduceErrors(error).join(", "),
          variant: "error",
        }),
      );
    } finally {
      this.isLoading = false;
    }
  }
}
```

---

## Case 3: Form validation — inline error, not toast

**Incorrect — toast for a form validation error:**

```typescript
// bookingForm.ts
public async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.formState.date) {
        this.dispatchEvent(
            new ShowToastEvent({ title: 'Date is required', variant: 'error' })
        );
        return;
    }
}
```

**Correct — inline error using `setCustomValidity` + `reportValidity`:**

```typescript
// bookingForm.ts
import { LightningElement } from "lwc";

interface BookingFormState {
  date: string;
}

// @ts-ignore
export default class BookingForm extends LightningElement {
  formState: BookingFormState = { date: "" };

  public handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formState = { ...this.formState, [target.name]: target.value };
  }

  public handleSubmit(event: Event): void {
    event.preventDefault();

    const dateInput = this.template.querySelector<HTMLInputElement>('[data-id="date-input"]');
    if (!dateInput) return;

    if (!this.formState.date) {
      dateInput.setCustomValidity("Please select an appointment date.");
      dateInput.reportValidity();
      return;
    }

    dateInput.setCustomValidity("");
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
    <lightning-input
      data-id="date-input"
      name="date"
      type="date"
      label="Appointment Date"
      value="{formState.date}"
      onchange="{handleChange}">
    </lightning-input>
    <lightning-button type="submit" variant="brand" label="Book"></lightning-button>
  </form>
</template>
```

---

## Quick Decision Guide

| Situation                                  | Error Pattern                                 |
| ------------------------------------------ | --------------------------------------------- |
| `@wire` result — data/error both undefined | Show loading spinner                          |
| `@wire` returns error                      | Wire function handler + toast                 |
| Imperative Apex throws                     | `try/catch` + toast                           |
| Form field fails validation                | `setCustomValidity` + `reportValidity` inline |
| Multiple errors from LDS                   | `reduceErrors(error).join(', ')`              |

---

**Reference:** [Handle Errors in Lightning Data Service — Salesforce LWC Developer Guide](https://developer.salesforce.com/docs/platform/lwc/guide/data-error.html)
