# data-wire-vs-imperative

**Impact: HIGH**

`@wire` and imperative Apex calls serve different purposes. Using the wrong one leads to either components that cannot react to user actions, or unnecessary re-fetches that bypass the LDS cache.

> **Rule:**
>
> - Use `@wire` when data should load automatically and stay in sync with reactive properties.
> - Use imperative calls when data fetch must be triggered explicitly by a user action.
> - After an imperative DML that affects `@wire` Apex data, call `refreshApex` to sync the wire cache.
> - Do **not** call `refreshApex` on LDS wire adapters (`getRecord`, etc.) — LDS self-invalidates after `updateRecord` / `deleteRecord`.
> - To use `refreshApex`, the wire result must be stored as a **property** (not destructured).

> **Note on import path:** `refreshApex` moved to `lightning/apex` in API v59+. Use `@salesforce/apex` for older API versions.
>
> ```typescript
> // API v59+ (LWR / newer orgs)
> import { refreshApex } from "lightning/apex";
> // API v58 and below
> import { refreshApex } from "@salesforce/apex";
> ```

---

## Case 1: Using `@wire` for an operation that needs to be triggered by user action

**Incorrect — trying to trigger `@wire` from a button click:**

```typescript
// appointmentSearch.ts
import { LightningElement, wire } from "lwc";
import searchAppointments from "@salesforce/apex/AppointmentController.searchAppointments";

interface AppointmentRecord {
  Id: string;
  Name: string;
}

// @ts-ignore
export default class AppointmentSearch extends LightningElement {
  searchTerm: string = "";

  // Fires on component load — cannot be manually re-triggered.
  // @ts-ignore
  @wire(searchAppointments, { term: "$searchTerm" })
  appointments: { data?: AppointmentRecord[]; error?: unknown };

  public handleSearch(): void {
    // Does nothing — @wire already ran on load.
  }
}
```

**Correct — use imperative call inside the event handler:**

```typescript
// appointmentSearch.ts
import { LightningElement } from "lwc";
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
  error: unknown = null;

  public handleChange(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  public async handleSearch(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      this.appointments = await searchAppointments({ term: this.searchTerm });
    } catch (e) {
      this.error = e;
    } finally {
      this.isLoading = false;
    }
  }
}
```

---

## Case 2: Using imperative call in `connectedCallback` when `@wire` would suffice

**Incorrect — imperative in `connectedCallback`, does not react to `recordId` changes:**

```typescript
// patientSummary.ts
import { LightningElement, api } from "lwc";
import getPatientSummary from "@salesforce/apex/PatientController.getPatientSummary";

interface PatientSummaryRecord {
  Name: string;
}

// @ts-ignore
export default class PatientSummary extends LightningElement {
  // @ts-ignore
  @api recordId: string;
  summary: PatientSummaryRecord | null = null;

  // Runs once on mount. Does not re-run if recordId changes.
  // Bypasses LDS cache — always fires a new SOQL query.
  public async connectedCallback(): Promise<void> {
    this.summary = await getPatientSummary({ recordId: this.recordId });
  }
}
```

**Correct — `@wire` reacts to `recordId` changes and uses LDS cache:**

```typescript
// patientSummary.ts
import { LightningElement, api, wire } from "lwc";
import getPatientSummary from "@salesforce/apex/PatientController.getPatientSummary";

interface PatientSummaryRecord {
  Name: string;
}

// @ts-ignore
export default class PatientSummary extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  // @ts-ignore
  @wire(getPatientSummary, { recordId: "$recordId" })
  summary: { data?: PatientSummaryRecord; error?: unknown };
}
```

---

## Case 3: Syncing `@wire` Apex data after imperative DML — `refreshApex`

**Incorrect — wire result destructured, `refreshApex` cannot be called:**

```typescript
// appointmentList.ts
import { LightningElement, api, wire } from "lwc";
import { refreshApex } from "lightning/apex";
import getAppointments from "@salesforce/apex/AppointmentController.getAppointments";
import deleteAppointment from "@salesforce/apex/AppointmentController.deleteAppointment";

// @ts-ignore
export default class AppointmentList extends LightningElement {
  // @ts-ignore
  @api recordId: string;
  appointments: unknown[] = [];

  // ❌ Destructured — refreshApex has nothing to reference
  // @ts-ignore
  @wire(getAppointments, { recordId: "$recordId" })
  public handleAppointments({ data, error }: { data?: unknown[]; error?: unknown }): void {
    this.appointments = data ?? [];
  }

  public async handleDelete(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    await deleteAppointment({ appointmentId: target.dataset.id });
    // ❌ Cannot call refreshApex — no wire result property stored
    await refreshApex(this.appointments);
  }
}
```

**Correct — store the full wire result, call `refreshApex` after DML:**

```typescript
// appointmentList.ts
import { LightningElement, api, wire } from "lwc";
import { refreshApex } from "lightning/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getAppointments from "@salesforce/apex/AppointmentController.getAppointments";
import deleteAppointment from "@salesforce/apex/AppointmentController.deleteAppointment";
import { reduceErrors } from "c/utils";

interface AppointmentRecord {
  Id: string;
  Name: string;
}

type WireResult<T> = { data?: T; error?: unknown };

// @ts-ignore
export default class AppointmentList extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  // ✅ Store full wire result — refreshApex needs the whole object
  wiredAppointments: WireResult<AppointmentRecord[]> = {};

  public get appointments(): AppointmentRecord[] {
    return this.wiredAppointments?.data ?? [];
  }

  // @ts-ignore
  @wire(getAppointments, { recordId: "$recordId" })
  public handleAppointments(result: WireResult<AppointmentRecord[]>): void {
    this.wiredAppointments = result; // ✅ keep reference for refreshApex
  }

  public async handleDelete(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    try {
      await deleteAppointment({ appointmentId: target.dataset.id });
      await refreshApex(this.wiredAppointments); // ✅ pass the stored wire result
    } catch (error) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Delete failed",
          message: reduceErrors(error).join(", "),
          variant: "error",
        }),
      );
    }
  }
}
```

---

## Quick Decision Guide

| Situation                                                    | Use                                  |
| ------------------------------------------------------------ | ------------------------------------ |
| Data loads when component mounts                             | `@wire`                              |
| Data depends on a reactive property (`$recordId`)            | `@wire`                              |
| Fetch triggered by button click or form submit               | Imperative                           |
| Operation has side effects (send email, run calculation)     | Imperative                           |
| Apex `@wire` data stale after imperative DML                 | `refreshApex(this.wiredResult)`      |
| LDS `@wire` data stale after `updateRecord` / `deleteRecord` | ❌ Not needed — LDS self-invalidates |

---

**Reference:** [Call Apex Methods — Salesforce LWC Developer Guide](https://developer.salesforce.com/docs/platform/lwc/guide/apex.html)
