# template-track-immutable

**Impact: MEDIUM**

`@track` was required in early LWC to make object/array properties reactive. Since Spring '20, all properties are tracked deeply by default. The correct way to trigger reactivity is through immutable updates.

> **Rule:**
>
> - Do not use `@track` — it is no longer needed.
> - Trigger reactivity on objects: `this.obj = { ...this.obj, key: value }`.
> - Trigger reactivity on arrays: `[...arr, newItem]`, `arr.filter(...)`, `arr.map(...)`.
> - Never mutate an object or array in place and expect the template to re-render.

---

## Case 1: Unnecessary `@track`, in-place mutation

**Incorrect:**

```typescript
// appointmentForm.ts
import { LightningElement, track } from "lwc";

interface AppointmentFormState {
  date: string;
  time: string;
  notes: string;
}

// @ts-ignore
export default class AppointmentForm extends LightningElement {
  // @ts-ignore
  @track isLoading: boolean = false; // ❌ unnecessary
  // @ts-ignore
  @track errorMessage: string = ""; // ❌ unnecessary
  // @ts-ignore
  @track formState: AppointmentFormState = { date: "", time: "", notes: "" };

  public handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    // ❌ Mutates in place — template may not re-render reliably
    (this.formState as Record<string, string>)[target.name] = target.value;
  }
}
```

**Correct — no `@track`, immutable update:**

```typescript
// appointmentForm.ts
import { LightningElement } from "lwc";

interface AppointmentFormState {
  date: string;
  time: string;
  notes: string;
}

// @ts-ignore
export default class AppointmentForm extends LightningElement {
  isLoading: boolean = false;
  errorMessage: string = "";
  formState: AppointmentFormState = { date: "", time: "", notes: "" };

  public handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    // ✅ New object reference — LWC detects the change and re-renders
    this.formState = { ...this.formState, [target.name]: target.value };
  }
}
```

---

## Case 2: Mutating an array in place

**Incorrect — push/splice mutates the existing reference, no re-render:**

```typescript
// appointmentList.ts
import { LightningElement } from "lwc";

interface AppointmentRecord {
  Id: string;
  Name: string;
}

// @ts-ignore
export default class AppointmentList extends LightningElement {
  appointments: AppointmentRecord[] = [];

  public handleAdd(newAppointment: AppointmentRecord): void {
    this.appointments.push(newAppointment); // ❌ mutates in place
  }

  public handleRemove(appointmentId: string): void {
    const index = this.appointments.findIndex((a) => a.Id === appointmentId);
    this.appointments.splice(index, 1); // ❌ mutates in place
  }
}
```

**Correct — new array reference:**

```typescript
// appointmentList.ts
import { LightningElement } from "lwc";

interface AppointmentRecord {
  Id: string;
  Name: string;
}

// @ts-ignore
export default class AppointmentList extends LightningElement {
  appointments: AppointmentRecord[] = [];

  public handleAdd(newAppointment: AppointmentRecord): void {
    this.appointments = [...this.appointments, newAppointment]; // ✅
  }

  public handleRemove(appointmentId: string): void {
    this.appointments = this.appointments.filter((a) => a.Id !== appointmentId); // ✅
  }

  public handleUpdate(updatedAppointment: AppointmentRecord): void {
    this.appointments = this.appointments.map((a) =>
      a.Id === updatedAppointment.Id ? { ...a, ...updatedAppointment } : a,
    ); // ✅
  }

  public handleRemoveClick(event: Event): void {
    const target = event.target as HTMLElement;
    this.handleRemove(target.dataset.id ?? "");
  }
}
```

---

## Case 3: Updating a nested object property

**Incorrect — mutating nested property:**

```typescript
// profileForm.ts
public handleAddressChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    // ❌ Mutates nested object — no re-render
    this.formState.address.city = target.value;
}
```

**Correct — spread at every changed level:**

```typescript
// profileForm.ts
import { LightningElement } from "lwc";

interface Address {
  city: string;
  street: string;
}

interface ProfileFormState {
  name: string;
  address: Address;
}

// @ts-ignore
export default class ProfileForm extends LightningElement {
  formState: ProfileFormState = {
    name: "",
    address: { city: "", street: "" },
  };

  public handleAddressChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formState = {
      ...this.formState,
      address: {
        ...this.formState.address,
        [target.name]: target.value,
      },
    };
  }
}
```

---

## Quick Decision Guide

| Situation                     | Pattern                                    |
| ----------------------------- | ------------------------------------------ |
| Update a primitive property   | Direct assignment: `this.value = newValue` |
| Update one field in an object | `this.obj = { ...this.obj, field: value }` |
| Add item to array             | `this.arr = [...this.arr, newItem]`        |
| Remove item from array        | `this.arr = this.arr.filter(...)`          |
| Update item in array          | `this.arr = this.arr.map(...)`             |
| Update nested object          | Spread at every changed level              |
| Should I use `@track`?        | No                                         |

---

**Reference:** [Reactivity — Salesforce LWC Developer Guide](https://developer.salesforce.com/docs/platform/lwc/guide/reactivity.html)
