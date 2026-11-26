# Adapter Pattern — Notification Delivery

Section author: Lorand Pervizaj · SWEN-383 Part 2

Part 1 identifies the risk under README.md, “Design Risk 1: Email is hard-wired into the system.” It describes LibraryController and ReminderScheduler calling EmailSender directly. The class diagram in docs/uml/class-diagram.puml shows the later CirculationController and ReminderScheduler associations to EmailSender. These repository artifacts provide the before-design evidence: changing a provider's interface would affect the clients that coordinate library work.

Adapter isolates that interface change. NotificationSender is the Target and defines sendTo(to, message). EmailAdapter extends it and wraps EmailService, the Adaptee. The adapter converts two positional arguments into deliver({recipients: [to], subject, body}). EmailService adds its configured sender address and stores the message in an outbox. This is interface translation between different parameter structures; delivery remains simulated and sends no real email.

ReminderScheduler uses the Target for overdue reminders. The intended hold-message client is Elion's HoldNotifier. In the corrected Observer architecture, Book is the Subject: a controller or scheduler assigns a hold, then calls Book.notify(reservation). Book forwards the event to subscribed HoldObserver implementations. HoldNotifier identifies the student and calls NotificationSender.sendTo(); EmailAdapter translates that call for EmailService. A refused or throwing hold must not emit the event. Observer manages subscriptions and event delivery, while Adapter translates the delivery interface.

The design supports Dependency Inversion because notification clients receive a small abstraction rather than constructing a provider. It supports Single Responsibility by keeping provider translation in EmailAdapter and fine, reservation and queue rules in their domain objects. GRASP Protected Variations and Indirection apply at the provider boundary. Another provider that fits sendTo(to, message) can be supported with a new adapter and composition-root wiring, without changing those clients.

The cost is three classes and an additional call boundary for a small application. A channel that needs a different address model may require changing the Target. Adapter does not supply persistence, delivery retries or authentication; the outbox proves only the translated call. Construction in main.js must still name the concrete adapter and service, which is appropriate for dependency wiring.

Validation is deliberately limited. Adapter tests exercise the real Target, adapter and simulated provider. Hold workflow tests use a temporary Book Subject and concrete Observer double because Book, HoldObserver and HoldNotifier are absent from the published branches. Therefore the intended Observer-to-Adapter collaboration is specified and tested with doubles, not established as a completed application integration. Loan.createFine(), the settings calendar helper and the remaining domain/UI implementations are still integration dependencies, detailed in docs/integration-notes.md.

AI assistance disclosure: AI tools assisted implementation, review, documentation and test execution. This draft still requires Lorand's review and confirmation against the course's permitted AI-use policy before submission.
