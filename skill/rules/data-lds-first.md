# data-lds-first

**Impact: CRITICAL**

Use `lightning/uiRecordApi` for standard CRUD and record fetching before writing any Apex controller. LDS is backed by the **UI API cache** — the platform automatically deduplicates requests and shares cached data across all components on the page.

> **Rule:** If the operation is get / create / update / delete on a standard or custom object, reach for LDS first. Only fall back to Apex when LDS cannot cover the requirement (e.g. complex queries, aggregates, multi-object logic).

---

## Get a single record

**Incorrect — unnecessary Apex call, no caching:**

```typescript
// patientCard.ts
import { LightningElement, api, wire } from "lwc";
import getPatient from "@salesforce/apex/PatientController.getPatient";

// @ts-ignore
export default class PatientCard extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  // @ts-ignore
  @wire(getPatient, { recordId: "$recordId" })
  patient: { data?: unknown; error?: unknown };
}
```

**Correct — LDS handles caching, no SOQL consumed:**

```typescript
// patientCard.ts
import { LightningElement, api, wire } from "lwc";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import NAME_FIELD from "@salesforce/schema/Patient__c.Name";
import DOB_FIELD from "@salesforce/schema/Patient__c.Date_of_Birth__c";

type RecordResult = { data?: Record<string, unknown>; error?: unknown };

// @ts-ignore
export default class PatientCard extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  // @ts-ignore
  @wire(getRecord, { recordId: "$recordId", fields: [NAME_FIELD, DOB_FIELD] })
  patient: RecordResult;

  public get patientName(): string | null {
    return getFieldValue(this.patient.data, NAME_FIELD) as string | null;
  }

  public get patientDob(): string | null {
    return getFieldValue(this.patient.data, DOB_FIELD) as string | null;
  }
}
```

```html
<!-- patientCard.html -->
<template>
  <template lwc:if="{patient.data}">
    <p>{patientName}</p>
    <p>{patientDob}</p>
  </template>
</template>
```

---

## Create a record

**Incorrect — Apex DML, counts against DML governor limit per call:**

```typescript
// patientForm.ts
import { LightningElement } from "lwc";
import createPatient from "@salesforce/apex/PatientController.createPatient";

interface PatientFormState {
  name: string;
}

// @ts-ignore
export default class PatientForm extends LightningElement {
  formState: PatientFormState = { name: "" };

  public handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formState = { ...this.formState, [target.name]: target.value };
  }

  public async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await createPatient({ fields: this.formState }); // ❌ bypasses LDS cache
  }
}
```

**Correct — LDS `createRecord`, platform handles DML and cache invalidation:**

```typescript
// patientForm.ts
import { LightningElement } from "lwc";
import { createRecord } from "lightning/uiRecordApi";
import PATIENT_OBJECT from "@salesforce/schema/Patient__c";
import NAME_FIELD from "@salesforce/schema/Patient__c.Name";

interface PatientFormState {
  name: string;
}

// @ts-ignore
export default class PatientForm extends LightningElement {
  formState: PatientFormState = { name: "" };

  public handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formState = { ...this.formState, [target.name]: target.value };
  }

  public async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const fields: Record<string, string> = {
      [NAME_FIELD.fieldApiName]: this.formState.name,
    };
    await createRecord({ apiName: PATIENT_OBJECT.objectApiName, fields });
  }
}
```

---

## Update a record

**Incorrect:**

```typescript
// patientEditForm.ts
import { LightningElement, api } from "lwc";
import updatePatient from "@salesforce/apex/PatientController.updatePatient";

// @ts-ignore
export default class PatientEditForm extends LightningElement {
  // @ts-ignore
  @api recordId: string;
  formState = { name: "" };

  public handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formState = { ...this.formState, [target.name]: target.value };
  }

  public async handleSave(): Promise<void> {
    await updatePatient({ recordId: this.recordId, fields: this.formState }); // ❌
  }
}
```

**Correct — `updateRecord` automatically refreshes all components holding the same record:**

```typescript
// patientEditForm.ts
import { LightningElement, api } from "lwc";
import { updateRecord } from "lightning/uiRecordApi";
import ID_FIELD from "@salesforce/schema/Patient__c.Id";
import NAME_FIELD from "@salesforce/schema/Patient__c.Name";

// @ts-ignore
export default class PatientEditForm extends LightningElement {
  // @ts-ignore
  @api recordId: string;
  formState = { name: "" };

  public handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formState = { ...this.formState, [target.name]: target.value };
  }

  public async handleSave(): Promise<void> {
    const fields: Record<string, string> = {
      [ID_FIELD.fieldApiName]: this.recordId,
      [NAME_FIELD.fieldApiName]: this.formState.name,
    };
    await updateRecord({ fields });
  }
}
```

---

## Delete a record

**Incorrect:**

```typescript
// patientListItem.ts
import { LightningElement, api } from "lwc";
import deletePatient from "@salesforce/apex/PatientController.deletePatient";

// @ts-ignore
export default class PatientListItem extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  public async handleDelete(): Promise<void> {
    await deletePatient({ recordId: this.recordId }); // ❌
  }
}
```

**Correct:**

```typescript
// patientListItem.ts
import { LightningElement, api } from "lwc";
import { deleteRecord } from "lightning/uiRecordApi";

// @ts-ignore
export default class PatientListItem extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  public async handleDelete(): Promise<void> {
    await deleteRecord(this.recordId);
  }
}
```

---

## When LDS is NOT enough — fall back to Apex

Use Apex when the operation requires `WHERE`, `ORDER BY`, aggregates, joins, or complex server-side logic.

```typescript
// appointmentList.ts — acceptable Apex fallback
import { LightningElement, api, wire } from "lwc";
import getAppointmentsByPatient from "@salesforce/apex/AppointmentController.getAppointmentsByPatient";

interface AppointmentRecord {
  Id: string;
  Name: string;
}

// @ts-ignore
export default class AppointmentList extends LightningElement {
  // @ts-ignore
  @api recordId: string;

  // @ts-ignore
  @wire(getAppointmentsByPatient, { patientId: "$recordId" })
  appointments: { data?: AppointmentRecord[]; error?: unknown };
}
```

---

**Reference:** [lightning/uiRecordApi — Salesforce LWC Developer Guide](https://developer.salesforce.com/docs/platform/lwc/guide/reference-lightning-ui-api-record.html)
