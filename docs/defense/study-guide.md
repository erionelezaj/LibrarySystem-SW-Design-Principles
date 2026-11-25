# Defense study guide — Lorand Pervizaj (The Principled Four)

Personal preparation material for the SWEN-383 Part 2 defense (7 December 2026). Not part of the final
report unless the team asks for it.

---

## 1. My classes and what each one does

### `NotificationSender` — the Target
The one abstraction the library depends on for notifications: `sendTo(to, message)`. JavaScript has no
interface, so the base method `throw`s — the course convention for an unimplemented contract. It exists so
that every client (scheduler, hold notifier) talks to *our* interface, never to a provider.
*Why here:* this is the stable point of the design; it holds nothing but the agreement (Protected Variations).

### `EmailAdapter` — the Adapter
Extends `NotificationSender`, receives an `EmailService` through the constructor and stores it. Its
`sendTo(to, message)` builds the provider's own payload — `{recipients: [to], subject, body}` — and calls
`service.deliver(...)`. Provider details (subject line, sender address, recipient list) never leave this class.
*Why here:* translation is the single responsibility of an adapter (SRP); nothing else in the system should
know that the provider wants an object instead of two strings.

### `EmailService` — the Adaptee
The simulated provider: its constructor takes a `fromAddress`, `deliver(mail)` pushes the mail into an
`outbox` and prints it to the console. It has no idea the library exists.
*Why here:* it models an external system whose interface we do not control. It is deliberately *not* a domain
class — no loans, no fines, no students.

### `Fine` — the domain object for one penalty
Attributes `amount`, `paid`, `waived`; methods `pay()`, `waive()`, `isPaid()`, `isWaived()`, `isSettled()`,
`getAmount()`. Both `pay()` and `waive()` return `false` and change nothing if the fine is already settled.
*Why here:* the fine is the only object that knows whether it is settled — Information Expert. The amount is
never calculated here: `LibrarySettings.calculateFine(daysLate)` produces it and `Loan.createFine(amount)`
attaches it (composition `Loan *-- Fine`).

### `ReminderScheduler` — the daily job
- `checkOverdueLoans(today)`: asks `Catalog.findOverdueLoans(today)`, skips returned or not-overdue loans,
  skips anything already reminded today (it keeps a small `overdueNotices` record of loan + day), and sends
  one message per loan per day through the injected `NotificationSender`.
- `checkExpiredHolds(today)`: asks `Catalog.findExpiredHolds(today)`, for each one captures the copy, calls
  `reservation.expire(today)` (which releases the copy), then `copy.getBook().nextReservation()`; if a student
  is waiting it computes `settings.calculateHoldDueDate(today)`, assigns the hold and calls
  `notifier.notify(reservation)`.
*Why here:* no domain concept means "run once a day" — GRASP Pure Fabrication keeps that out of `Loan`,
`Reservation` and `Book`.

### My three methods in `CirculationController` (Erion's file, isolated branch)
- `returnCopy(barcode)`: find copy → find active loan → refuse if either is missing or the loan is already
  returned → `loan.close(today)` → if overdue, `settings.calculateFine(loan.daysLate(today))` and
  `loan.createFine(amount)` → `copy.getBook().nextReservation()` → if someone is waiting,
  `settings.calculateHoldDueDate(today)`, `reservation.hold(...)`, then `notifier.notify(reservation)` →
  return the `Fine` (or `null`).
- `payFine(fine)` / `waiveFine(fine)`: refuse if there is no fine, otherwise delegate to `fine.pay()` /
  `fine.waive()` and return its result.
*Why here:* GRASP Controller — the controller coordinates the use case and returns a result; every rule
(knowing the due date, knowing whether the fine is settled, knowing the fine rate) stays in the object that
holds that information.

---

## 2. The Adapter pattern in our project

| Participant | Our class |
|---|---|
| Target | `NotificationSender` (`sendTo(to, message)`) |
| Adapter | `EmailAdapter` (extends Target, holds the service) |
| Adaptee | `EmailService` (`deliver({recipients, subject, body})`) |
| Clients | `ReminderScheduler`, `HoldNotifier` |

**Why Adapter instead of a direct email dependency:** Part 1's class diagram had
`CirculationController -- EmailSender` and `ReminderScheduler -- EmailSender`. Changing provider or adding a
channel meant editing those clients — business logic coupled to a detail we do not control. Adapter keeps one
stable interface and confines the provider's shape to one class: DIP (clients depend on our abstraction),
OCP (new provider = new adapter), low coupling, and GRASP Protected Variations / Indirection.

**Adapter vs Decorator:** a Decorator keeps the *same* interface and adds behaviour around it; an Adapter
*changes* the interface. Our provider's interface is what it is, so we must convert — Decorator would not help.

**Adapter vs Proxy:** a Proxy implements the *same* interface to control access (lazy loading, remote access,
protection). `EmailAdapter` implements our interface but wraps a *different* one, and controls nothing.

**Adapter vs Strategy:** a Strategy swaps interchangeable algorithms behind one common interface (several ways
to do the same job). We do not choose between notification algorithms; we convert one fixed call to a
provider's format. (If we ever had "email vs SMS vs push" chosen at runtime behind one interface, that would
start as Adapter-per-channel, and a Strategy could sit above it.)

**Observer + Adapter together:** Observer answers *that* someone must be notified and *who* (a hold was
assigned → the student behind that reservation). Adapter answers *how* the message reaches a particular
provider. Chain in our code:
`returnCopy()` → `notifier.notify(reservation)` → `HoldNotifier` (gets the student's email) →
`EmailAdapter.sendTo(email, message)` → `EmailService.deliver({...})`.

**Introducing a different provider:** write `SMSGateway` with its own interface plus `SmsAdapter extends
NotificationSender`, then change only `main.js` (`new SmsAdapter(new SMSGateway(...))`). No client, domain or
controller code changes — provided the channel still fits `sendTo(to, message)`; a channel with no address
would force us to widen the Target, which is the acknowledged cost of the pattern.

---

## 3. Patterns and principles the whole team should be ready on

**Singleton + Dependency Injection:** `LibrarySettings.getInstance()` creates the object once (the
constructor throws on a second direct construction) and *everything* receives it as a constructor argument.
Singleton guarantees one set of policies; DI keeps that guarantee visible in the wiring instead of hidden
inside `LibrarySettings.getInstance()` calls everywhere, and makes each collaborator easy to replace in tests.

**Three controllers:** one screen, one controller — `StudentController` (search/reserve), `CirculationController`
(lend/return/fines), `CollectionController` (books/copies/settings). Each gets a focused set of operations and
three collaborators instead of one class with 19 operations and every collaborator: GRASP Controller plus high
cohesion, and a change to reservations cannot destabilize copy management.

**GRASP cheat sheet with our examples:** Controller (the three controllers), Information Expert (`Fine` decides
settlement, `Loan` computes days late, `LibrarySettings` the rate), Pure Fabrication (`ReminderScheduler`),
Protected Variations (behind `NotificationSender`), Indirection (the adapter between clients and the provider),
Low Coupling (clients hold one small interface each).

---

## 4. Scenarios the professor is likely to ask you to walk through

**A book comes back late:** scan → `catalog.findCopy(barcode)` → `copy.currentLoan()` → `loan.close(today)` →
`loan.isOverdue(today)` is true → `loan.daysLate(today)` → `settings.calculateFine(days)` (rate 0.50/day comes
from the Singleton, never from this code) → `loan.createFine(amount)` composes the `Fine` on the loan →
`copy.getBook().nextReservation()` → nobody waiting → copy back on the shelf → controller returns the `Fine`,
which the desk shows and later records as paid (`fine.pay()`).

**Several students reserve the same book:** `Book` keeps the ordered waiting line; reservations are for the
title, not the copy. When a copy frees, `book.nextReservation()` returns the first reservation still in
`waiting` status; only that reservation gets `hold(holdDueDate, copy)` and only that student gets
`notify(reservation)` → one email. The others keep their order and wait for the next free copy.

**A reservation expires:** once a day `checkExpiredHolds(today)` finds holds whose `holdDueDate` has passed,
captures the copy, calls `reservation.expire(today)` (releasing the copy), then asks the book for the next
waiting reservation: if there is one, the copy is held for them with a fresh
`settings.calculateHoldDueDate(today)` and they are notified; if there is nobody waiting, the copy simply goes
back on the shelf. Running the scheduler again the same day changes nothing, because the expired reservation
is no longer in the set `findExpiredHolds()` returns.

**A book is returned twice / an unknown barcode:** `returnCopy()` returns `null` — no active loan, or the loan
already carries a `returnedDate`, so no second close, no second fine, no second notification.

---

## 5. Weaknesses and trade-offs to admit honestly

1. **Extra structure:** three classes where Part 1 had one, and one more hop when tracing a message.
2. **Simulated delivery:** the outbox and console log model the call boundary only — no real failures,
   retries, authentication or network.
3. **The `notifier.notify(reservation)` contract** is implemented by my call sites but `HoldNotifier` itself is
   Elion's; until it lands, hold notification is exercised with a test double.
4. **`returnCopy()` returns `Fine | null`,** as agreed in Part 1, so `null` means both "refused" and
   "returned with no fine"; the desk distinguishes them by checking `copy.currentLoan()` before/after
   (documented for Dren). A richer result type would be clearer but would change the agreed signature.
5. **The once-a-day record lives in memory** (`overdueNotices`) — fine for an in-memory system, lost on
   restart, and it grows one entry per loan per day.
6. **Contract-dependent behaviour:** correct returns rely on `Copy.currentLoan()` returning `null` for a closed
   loan and on `Book.nextReservation()` skipping non-waiting reservations — both documented in
   `docs/integration-notes.md` and covered by doubles in my tests.
7. **No persistence, no roles:** waivers and payments are not attributed to a staff member, because Part 1 put
   staff recording out of scope — so no authorization rule exists to enforce.

---

## 6. Comparison table: patterns we did not implement

| Pattern | Purpose | Where it could fit in our library system | Why we did not select it | When we would need it |
|---|---|---|---|---|
| **State** | An object changes behaviour when its internal state changes | `Copy` (available / on hold / on loan / damaged), `Reservation` (waiting / on hold / expired / cancelled / completed), `Loan`, `Fine` | Status fields plus a few `if`s are enough at this size; a class per state would multiply files for little gain | If states grew their own rules — e.g. damage workflows where each state allows different operations, or fines with partial payments and escalation |
| **Strategy** | Interchangeable algorithms behind one interface | Fine calculation policies, search/ranking of catalog results, message formatting | Policies already vary at runtime through `LibrarySettings` *data*, and each algorithm has one implementation | Two or more algorithms must coexist and be chosen at runtime — per-collection fine policies, or swappable relevance ranking |
| **Decorator** | Add responsibilities by wrapping an object with the *same* interface | Adding audit logging or a priority flag to notifications, extra behaviour on `Copy` | Our problem is a mismatched interface, not missing behaviour — decorating would not adapt `EmailService` | Optional behaviours stacked dynamically, e.g. log every notification and mark urgent ones without touching the sender |
| **Composite** | Treat individual objects and groups of objects uniformly | Catalog hierarchy (`Catalog` → `Book` → `Copy`), or a menu/UI tree | We never need a recursive "part-of" tree with identical operations on leaves and groups | Collections of collections — shelves → sections → books — where one operation must recurse over the whole tree |
| **Proxy** | A surrogate that controls access to a real object | Lazy-loading a book's copies, guarding librarian-only operations | No remote, expensive or protected resources yet; authentication is out of scope | Real persistence or large data (virtual/proxy loading), or role checks when staff accounts are introduced |
| **Command** | Encapsulate a request as an object | Undo/redo and an audit log of desk actions (undo a withdrawal, undo "mark damaged") | No undo, queueing or logging requirement in scope; direct calls are simpler | The librarian screen needs undo/redo, queued operations, or a replayable action history |
| **Factory Method** | Let subclasses (or code) decide which concrete product to create | Creating different notification channels, or loans with different policies | Construction is trivial and centralized in `main.js` wiring | Several product families vary at runtime and clients must not know the concrete class |
| **Builder** | Construct a complex object step by step | Assembling a `Book` with title, ISBN, author and copies | Our constructors take two or three arguments; nothing is multi-step | Many optional fields and construction rules (bulk import of a book with editions, copies and metadata) |
| **Prototype** | Clone an existing object as the template for a new one | "Duplicate this book record" for a new edition | No cloning requirement in the scope | A feature that copies existing records (duplicate a book entry, copy a reservation template) |
| **MVC** *(architectural)* | Separate Model, View and Controller | Our `LibraryRenderer` (View) + the three controllers (Controller) + domain classes (Model) already follow this split | We *do* use it — inherited from the lab architecture — but it is an architecture, not one of our three Part 2 design patterns | Formalizing it further: a view registry, data binding, or several screens driven by one model |

---

## 7. Twenty likely defense questions

1. **What problem does Adapter solve for us?** Isolating the provider's interface: clients call
   `sendTo(to, message)` and only `EmailAdapter` knows `EmailService.deliver({recipients, subject, body})`.
2. **Name the four Adapter participants and their roles in our code.** Target `NotificationSender`, Adapter
   `EmailAdapter`, Adaptee `EmailService`, Clients `ReminderScheduler` and `HoldNotifier`.
3. **What exactly is translated?** Two positional strings become a structured object: a recipient list, a
   subject line and the configured sender address — a genuinely different interface, not a rename.
4. **Why not call `EmailService` directly?** The clients would depend on a provider we do not control; changing
   providers would edit business logic — Dependency Inversion and Open/Closed would both be violated.
5. **How would you add SMS notifications?** New `SMSGateway` + `SmsAdapter extends NotificationSender`, rewire
   `main.js`; no client changes as long as `sendTo(to, message)` still expresses the message.
6. **Is this a real email integration?** No. `EmailService` is simulated: an outbox array and a console line.
   Real providers, credentials and network calls are out of scope.
7. **Adapter or Decorator?** Decorator keeps the interface and adds behaviour; Adapter converts an incompatible
   interface. We have a mismatch, so Adapter.
8. **Adapter or Proxy?** Proxy keeps the interface and controls access; Adapter implements our interface over a
   different one. We convert, we do not guard.
9. **Adapter or Strategy?** Strategy swaps interchangeable algorithms behind one interface; we translate one
   fixed call into a provider's format — there is no second algorithm to choose.
10. **How do Observer and Adapter work together?** Observer decides the event and the recipient
    (`notify(reservation)` → `HoldNotifier` → student's email); Adapter converts the sending call to the
    provider's interface.
11. **Where is the Observer trigger in your code?** In `returnCopy()` and `checkExpiredHolds()`, immediately
    after `reservation.hold(...)` succeeds — so nobody is emailed who did not receive a hold.
12. **What is Singleton here and why does it matter?** `LibrarySettings.getInstance()` — one shared object, so
    a hold period changed at the desk is the same value the scheduler uses overnight.
13. **How do Singleton and Dependency Injection work together?** One instance is created at start-up and passed
    into every collaborator's constructor: one source of policy, and no hidden global lookups inside classes.
14. **Why three controllers instead of one?** GRASP Controller plus cohesion: one controller per screen and
    task group, each with a handful of operations and three collaborators, instead of one 19-operation class.
15. **Walk through `returnCopy()` in order.** find copy → find active loan → refuse if invalid → close loan →
    if overdue, `calculateFine(daysLate)` and `loan.createFine` → `getBook().nextReservation()` → if a student
    waits, `calculateHoldDueDate`, `hold`, `notify` → return the `Fine`.
16. **Where does the fine rate live?** Only in `LibrarySettings.fineRate`, used through `calculateFine()`;
    a test asserts no other file in `src/` contains a policy value.
17. **Can a waived fine then be paid?** No. `pay()` and `waive()` both check `isSettled()` first, return
    `false` and leave the state untouched; the controller passes that `false` back to the UI.
18. **What happens when several students reserve the same title?** They wait in reservation order;
    `Book.nextReservation()` gives the freed copy to the first `waiting` reservation, which alone is held and
    notified; the rest keep their positions.
19. **What happens when a hold expires?** The daily check expires it (releasing the copy), then either holds
    the copy for the next waiting student with a fresh hold date and notifies them, or returns it to the shelf.
20. **What are the main weaknesses of your design?** One more layer of indirection and three classes instead of
    one; simulated delivery; `returnCopy()`'s `null` being both "refused" and "no fine"; an in-memory
    once-a-day record; and three behaviours that depend on teammates' contracts (`Copy.currentLoan()`,
    `Book.nextReservation()`, `HoldNotifier.notify()`), all documented in the integration notes and covered by
    test doubles.
