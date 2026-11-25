# Adapter Pattern — Notification Delivery

**Section author:** Lorand Pervizaj · **Team:** The Principled Four · **Course:** SWEN-383, Project Part 2

## 1. The design risk identified in Part 1

Part 1 recorded the design risk *"Email is hard-wired into the system"*. The Part 1 class diagram drew two
direct associations to the concrete sender class, `CirculationController "1" -- "1" EmailSender` and
`ReminderScheduler "1" -- "1" EmailSender`, and our report stated the consequence plainly: *"That works as
long as we only ever send email through one provider … the library could also switch to an email provider
with a different API. Either change would mean editing both classes."* The dependency pointed from the
business logic straight to a delivery mechanism, so a change at the delivery boundary rippled into the
classes that orchestrate lending, returns and daily reminders.

## 2. Why the Adapter pattern was selected

The variation we need to isolate is not in the library rules themselves but in the interface of the thing
that actually delivers a message. Adapter is the pattern that lets two incompatible interfaces meet without
either changing: we keep one stable, system-wide contract (`NotificationSender.sendTo(to, message)`) and let
an adapter translate that contract into whatever interface a particular provider exposes. The alternative —
continuing to call a concrete sender — couples every client to one provider's method names and parameter
shapes, and the alternative to *that* — rewriting the provider to match us — is impossible in general, since
a real provider's API is not ours to change. Adapter therefore protects the clients from a change we do not
control (GRASP Protected Variations) and keeps the translation in one place (GRASP Indirection).

## 3. Pattern participants in our implementation

| Participant | Our class | Role |
|---|---|---|
| Target | `NotificationSender` | The abstraction the library depends on: `sendTo(to, message)`. JavaScript has no interface, so the base method throws, following the course convention for an unimplemented contract. |
| Adapter | `EmailAdapter` | Extends `NotificationSender`, receives an `EmailService` through constructor injection, and translates `sendTo(to, message)` into the provider's own call. |
| Adaptee | `EmailService` | The simulated provider with its own interface, `deliver({recipients, subject, body})`, which records the mail in an outbox and prints it to the console. No real email is sent. |
| Clients | `ReminderScheduler`, `HoldNotifier` | Send overdue reminders and hold-ready notifications through the Target only; neither constructs nor names `EmailService`. |

## 4. Code from the final implementation

```js
export class EmailAdapter extends NotificationSender {
    constructor(service) {
        super();
        this.service = service;
    }

    sendTo(to, message) {
        this.service.deliver({
            recipients: [to],
            subject: SUBJECT,
            body: message
        });
    }
}
```

The translation is real, not cosmetic: the abstraction takes two positional strings and returns nothing,
while the provider takes one structured object with a recipient *list*, a subject line it requires and a
configured sender address — details that exist only inside the adapter.

## 5. Before-and-after evidence

**Before (Part 1).** The class diagram shows `CirculationController -- EmailSender` and
`ReminderScheduler -- EmailSender`, and our Part 1 report identified those two links as the risk. Adding a
second channel or a second provider meant editing both clients.

**After (Part 2).** The clients hold a `NotificationSender`; only `EmailAdapter` mentions the provider.
`tests/adapter.test.js` asserts that no file in `src/` other than `EmailService.js` and `EmailAdapter.js`
even contains the name `EmailService`, and that a substitute sender can be injected into a client without
touching the client's code. The remaining wiring (`main.js`) belongs to Erion; the class relationships it
must express are documented in `docs/integration-notes.md`.

## 6. Improvements to the design

- **Dependency Inversion.** `ReminderScheduler` and `HoldNotifier` now depend on our own abstraction, not on
  a provider class; the low-level detail depends on the high-level contract.
- **Open/Closed.** A new provider (or a future SMS channel that fits `sendTo`) is added by writing a new
  adapter and rewiring `main.js`; the clients are closed for modification.
- **Low coupling.** Each client knows one small interface instead of a provider's method names, parameter
  order and object shape.
- **Single Responsibility.** Translation of the message format lives in the adapter, delivery lives in the
  provider, and scheduling/observer logic stays in the scheduler and the notifier.
- **GRASP Protected Variations / Indirection.** The unstable element — the provider API — is hidden behind
  one object, so clients reach the provider through an extra, deliberate hop rather than directly.

## 7. Costs and trade-offs

The pattern costs an extra layer of classes and indirection: a reader tracing a message now passes through
`NotificationSender` → `EmailAdapter` → `EmailService` instead of one call, and for a single hardcoded
provider that is more structure than strictly necessary. The adapter also carries presentation details (the
subject line) that a richer provider could force it to grow. Replacing a provider still requires a new
adapter and updated dependency wiring — Adapter relocates that change, it does not abolish it. Finally, our
delivery is simulated: the outbox and console output model the call boundary only, not real failures,
retries or authentication, and if a future channel cannot be expressed as `sendTo(to, message)` (for example
a push notification with no address), the abstraction itself must be extended.

## 8. How Adapter and Observer work together

The two patterns solve different halves of one event. The Observer side (Elion's `HoldObserver` /
`HoldNotifier`) decides *that* a notification must happen and *who* receives it: when a hold is assigned,
`returnCopy()` or `checkExpiredHolds()` calls `notify(reservation)` and the hold notifier identifies the
student behind that reservation. The Adapter side decides *how* the resulting message reaches a particular
provider: the notifier calls `sendTo(email, message)` on the abstraction and `EmailAdapter` translates it
into `EmailService.deliver(...)`. Replacing our email provider therefore means a new adapter and new wiring
in `main.js`, with no change to the observer logic, the controllers or the domain classes.

---

**AI assistance disclosure.** This section, the JavaScript implementation it describes and the test suite
were prepared with the assistance of an AI coding assistant (OpenCode), used to inspect the repository,
draft and refactor code, and execute the tests. All design decisions, code, diagrams and claims in this
section were made, verified by running the tests, and approved by me, Lorand Pervizaj; any errors are my own.
