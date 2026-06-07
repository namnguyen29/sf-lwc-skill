# template-form-pattern

**Impact: HIGH**

LWC provides `lightning-record-edit-form` for standard CRUD forms. Only build a custom form when the UX requirement goes beyond what the base component supports.

> **Rule:**
>
> - Use `lightning-record-edit-form` for simple create/edit of a single record.
> - In custom forms, use a single `handleChange` keyed on `event.target.name` — never per-field handlers.
> - Keep all form state in one typed interface.
> - In multi-step wizards, the parent owns state and submits once at the final step. Each step exposes `validate()` and `getFormData()` as `@api` methods.

---

## When to use `lightning-record-edit-form`

```html
<!-- appointmentEditForm.html — no JS needed -->
<template>
  <lightning-record-edit-form record-id="{recordId}" object-api-name="Appointment__c">
    <lightning-messages></lightning-messages>
    <lightning-input-field field-name="Name"></lightning-input-field>
    <lightning-input-field field-name="Date__c"></lightning-input-field>
    <lightning-input-field field-name="Status__c"></lightning-input-field>
    <lightning-button type="submit" variant="brand" label="Save"></lightning-button>
  </lightning-record-edit-form>
</template>
```

---

## When to use a custom form

| Situation                            | Reason                                         |
| ------------------------------------ | ---------------------------------------------- |
| Multi-step wizard                    | `lightning-record-edit-form` cannot span steps |
| Conditional fields                   | Requires reactive state control                |
| Data from multiple objects           | LDS handles one object at a time               |
| Custom validation beyond field-level | Needs manual `checkValidity`                   |

---

## Case 1: Conditional fields — single `handleChange`, centralized state

**Incorrect — per-field handlers, scattered booleans:**

```typescript
// referralForm.ts
import { LightningElement } from "lwc";

// @ts-ignore
export default class ReferralForm extends LightningElement {
  referralType: string = "";
  specialistName: string = "";
  clinicName: string = "";
  showSpecialistFields: boolean = false;

  // ❌ Grows linearly with form size
  public handleTypeChange(event: Event): void {
    this.referralType = (event.target as HTMLInputElement).value;
    this.showSpecialistFields = this.referralType === "specialist";
  }

  public handleSpecialistChange(event: Event): void {
    this.specialistName = (event.target as HTMLInputElement).value;
  }
}
```

**Correct — single `handleChange`, derived conditional from state:**

```typescript
// referralForm.ts
import { LightningElement } from "lwc";

interface ReferralFormState {
  referralType: string;
  specialistName: string;
  clinicName: string;
  notes: string;
}

// @ts-ignore
export default class ReferralForm extends LightningElement {
  formState: ReferralFormState = {
    referralType: "",
    specialistName: "",
    clinicName: "",
    notes: "",
  };

  // ✅ One handler for all fields
  public handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formState = { ...this.formState, [target.name]: target.value };
  }

  // ✅ Derived from state — no extra boolean needed
  public get showSpecialistFields(): boolean {
    return this.formState.referralType === "specialist";
  }

  public handleSubmit(event: Event): void {
    event.preventDefault();
    const allInputs = this.template.querySelectorAll<HTMLInputElement>("lightning-input, lightning-combobox");
    const isValid = [...allInputs].reduce((valid, input) => {
      input.reportValidity();
      return valid && input.checkValidity();
    }, true);

    if (!isValid) return;
    this.submitForm();
  }

  private submitForm(): void {
    // submit logic
  }
}
```

---

## Case 2: Multi-step wizard — parent owns state, submits once at final step

**Step component — renders fields, exposes `validate()` and `getFormData()`:**

```typescript
// onboardingStep1.ts
import { LightningElement, api } from "lwc";

interface Step1FormState {
  firstName: string;
  lastName: string;
  email: string;
}

// @ts-ignore
export default class OnboardingStep1 extends LightningElement {
  formState: Step1FormState = {
    firstName: "",
    lastName: "",
    email: "",
  };

  public handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formState = { ...this.formState, [target.name]: target.value };
  }

  // @ts-ignore
  @api
  public validate(): boolean {
    const inputs = this.template.querySelectorAll<HTMLInputElement>("lightning-input");
    return [...inputs].reduce((valid, input) => {
      input.reportValidity();
      return valid && input.checkValidity();
    }, true);
  }

  // @ts-ignore
  @api
  public getFormData(): Step1FormState {
    return { ...this.formState };
  }
}
```

**Parent — accumulates state, submits once at final step:**

```typescript
// onboardingWizard.ts
import { LightningElement } from "lwc";
import { createRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { reduceErrors } from "c/utils";
import CONTACT_OBJECT from "@salesforce/schema/Contact";

interface StepComponent extends HTMLElement {
  validate(): boolean;
  getFormData(): Record<string, string>;
}

// @ts-ignore
export default class OnboardingWizard extends LightningElement {
  currentStep: number = 1;
  totalSteps: number = 3;
  formData: Record<string, string> = {};

  public get isLastStep(): boolean {
    return this.currentStep === this.totalSteps;
  }

  public get isStep1(): boolean {
    return this.currentStep === 1;
  }
  public get isStep2(): boolean {
    return this.currentStep === 2;
  }
  public get isStep3(): boolean {
    return this.currentStep === 3;
  }
  public get showPrev(): boolean {
    return this.currentStep > 1;
  }
  public get nextLabel(): string {
    return this.isLastStep ? "Submit" : "Next";
  }

  public async handleNext(): Promise<void> {
    const stepComponent = this.template.querySelector<StepComponent>('[data-id="current-step"]');
    if (!stepComponent) return;

    if (!stepComponent.validate()) return;

    this.formData = { ...this.formData, ...stepComponent.getFormData() };

    if (this.isLastStep) {
      await this.submitAll();
      return;
    }

    this.currentStep += 1;
  }

  public handlePrev(): void {
    this.currentStep -= 1;
  }

  private async submitAll(): Promise<void> {
    try {
      await createRecord({
        apiName: CONTACT_OBJECT.objectApiName,
        fields: this.formData,
      });
      this.dispatchEvent(new ShowToastEvent({ title: "Success", message: "Onboarding complete.", variant: "success" }));
    } catch (error) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Submission failed",
          message: reduceErrors(error).join(", "),
          variant: "error",
        }),
      );
    }
  }
}
```

```html
<!-- onboardingWizard.html -->
<template>
  <template lwc:if="{isStep1}">
    <c-onboarding-step1 data-id="current-step"></c-onboarding-step1>
  </template>
  <template lwc:if="{isStep2}">
    <c-onboarding-step2 data-id="current-step"></c-onboarding-step2>
  </template>
  <template lwc:if="{isStep3}">
    <c-onboarding-step3 data-id="current-step"></c-onboarding-step3>
  </template>

  <div>
    <template lwc:if="{showPrev}">
      <lightning-button label="Back" onclick="{handlePrev}"></lightning-button>
    </template>
    <lightning-button variant="brand" label="{nextLabel}" onclick="{handleNext}"></lightning-button>
  </div>
</template>
```

---

## Quick Decision Guide

| Situation                        | Pattern                                                             |
| -------------------------------- | ------------------------------------------------------------------- |
| Simple create/edit single record | `lightning-record-edit-form`                                        |
| Conditional fields               | Custom form + `get` derived from `formState`                        |
| Multi-step wizard                | Parent owns `formData`; step exposes `validate()` + `getFormData()` |
| Per-field change handlers        | ❌ Use single `handleChange` keyed on `name`                        |

---

**Reference:** [Build Custom UI to Create and Edit Records — Salesforce LWC Developer Guide](https://developer.salesforce.com/docs/platform/lwc/guide/data-salesforce-write.html)
