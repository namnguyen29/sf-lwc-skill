# events-lms

**Impact: HIGH**

Lightning Message Service (LMS) is the platform-native solution for communication between components that have no parent-child relationship, or that live in different shadow roots across App Builder regions and Experience Cloud portal slots.

> **Rule:**
>
> - Use LMS when components have **no shared parent**, or live in **different App Builder regions / Experience Cloud slots**.
> - Always **unsubscribe** in `disconnectedCallback` to prevent memory leaks.
> - Define each message channel in a dedicated `.messageChannel` metadata file.

> **Note for Jest tests:** `@salesforce/messageChannel` requires a mock in Jest. Add the mock in `jest.config.js`:
>
> ```javascript
> moduleNameMapper: {
>   '@salesforce/messageChannel/(.+)': '<rootDir>/path/to/__mocks__/messageChannel.js'
> }
> ```

---

## Decision Guide: LMS vs Custom Event

| Scenario                                                  | Use                                                      |
| --------------------------------------------------------- | -------------------------------------------------------- |
| Child notifies direct parent                              | Custom event (`bubbles: false`)                          |
| Child notifies distant ancestor (same shadow tree)        | Custom event (`bubbles: true`)                           |
| Component in Experience Cloud header notifies main region | **LMS**                                                  |
| Two sibling components with no shared parent              | **LMS**                                                  |
| Cross-tab or cross-page communication                     | Not supported — use server-side state or Platform Events |

---

## Step 1: Define the MessageChannel metadata file

```xml
<!-- force-app/main/default/messageChannels/AppointmentSelected.messageChannel-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<LightningMessageChannel xmlns="http://soap.sforce.com/2006/04/metadata">
    <masterLabel>AppointmentSelected</masterLabel>
    <isExposed>true</isExposed>
    <description>Notifies subscribers when a patient appointment is selected.</description>
    <lightningMessageFields>
        <fieldName>appointmentId</fieldName>
        <description>Salesforce record Id of the selected appointment.</description>
    </lightningMessageFields>
    <lightningMessageFields>
        <fieldName>patientName</fieldName>
        <description>Display name of the patient.</description>
    </lightningMessageFields>
</LightningMessageChannel>
```

---

## Step 2: Publisher

**Incorrect — custom event cannot reach a component in a different region:**

```typescript
// appointmentList.ts
handleAppointmentClick(event: Event): void {
    const target = event.currentTarget as HTMLElement;
    this.dispatchEvent(
        new CustomEvent('appointmentselected', {
            bubbles: true,
            composed: true, // ❌ still won't reach a separate region/slot
            detail: { appointmentId: target.dataset.id },
        })
    );
}
```

**Correct — publish via LMS:**

```typescript
// appointmentList.ts
import { LightningElement, wire } from "lwc";
import { MessageContext, publish, MessageContextType } from "lightning/messageService";
import APPOINTMENT_SELECTED from "@salesforce/messageChannel/AppointmentSelected__c";

interface AppointmentSelectedPayload {
  appointmentId: string;
  patientName: string;
}

// @ts-ignore
export default class AppointmentList extends LightningElement {
  // @ts-ignore
  @wire(MessageContext)
  messageContext: MessageContextType;

  public handleAppointmentClick(event: Event): void {
    const target = event.currentTarget as HTMLElement;

    const payload: AppointmentSelectedPayload = {
      appointmentId: target.dataset.id ?? "",
      patientName: target.dataset.patientName ?? "",
    };

    publish(this.messageContext, APPOINTMENT_SELECTED, payload);
  }
}
```

---

## Step 3: Subscriber

**Incorrect — subscribing without unsubscribing:**

```typescript
// appointmentDetail.ts
import { LightningElement, wire } from "lwc";
import { MessageContext, subscribe, MessageContextType } from "lightning/messageService";
import APPOINTMENT_SELECTED from "@salesforce/messageChannel/AppointmentSelected__c";

// @ts-ignore
export default class AppointmentDetail extends LightningElement {
  // @ts-ignore
  @wire(MessageContext)
  messageContext: MessageContextType;

  public connectedCallback(): void {
    subscribe(this.messageContext, APPOINTMENT_SELECTED, (message) => {
      this.appointmentId = (message as { appointmentId: string }).appointmentId;
    });
    // ❌ return value discarded — cannot unsubscribe later
  }
}
```

**Correct — store the subscription handle and unsubscribe in `disconnectedCallback`:**

```typescript
// appointmentDetail.ts
import { LightningElement, wire } from "lwc";
import {
  MessageContext,
  subscribe,
  unsubscribe,
  MessageContextType,
  MessageServiceSubscription,
} from "lightning/messageService";
import APPOINTMENT_SELECTED from "@salesforce/messageChannel/AppointmentSelected__c";

interface AppointmentSelectedPayload {
  appointmentId: string;
  patientName: string;
}

// @ts-ignore
export default class AppointmentDetail extends LightningElement {
  // @ts-ignore
  @wire(MessageContext)
  messageContext: MessageContextType;

  subscription: MessageServiceSubscription | null = null;
  appointmentId: string | null = null;

  public connectedCallback(): void {
    this.subscription = subscribe(this.messageContext, APPOINTMENT_SELECTED, (message) =>
      this.handleMessage(message as AppointmentSelectedPayload),
    );
  }

  public disconnectedCallback(): void {
    unsubscribe(this.subscription); // ✅ clean up when component leaves the DOM
    this.subscription = null;
  }

  private handleMessage(message: AppointmentSelectedPayload): void {
    this.appointmentId = message.appointmentId;
  }
}
```

---

## Quick Decision Guide

| Situation                                | Pattern                                               |
| ---------------------------------------- | ----------------------------------------------------- |
| Same shadow tree, parent-child           | Custom event                                          |
| Different regions / unrelated components | LMS                                                   |
| Payload type                             | Typed interface + cast on receive                     |
| Unsubscribe                              | Always in `disconnectedCallback`                      |
| Jest tests                               | Mock `@salesforce/messageChannel` in `jest.config.js` |

---

**Reference:** [Lightning Message Service — Salesforce LWC Developer Guide](https://developer.salesforce.com/docs/platform/lwc/guide/use-message-service.html)
