# Integration notes — Lorand's Part 2 contribution

These are the exact changes my code needs from each teammate. Nothing here has been applied to your files.

## What I delivered (branch `feature/lorand-part2`)

| File | Contents |
|---|---|
| `src/NotificationSender.js` | Adapter **Target**: `sendTo(to, message)`, throws while unimplemented. |
| `src/EmailService.js` | Adapter **Adaptee**: simulated provider, `deliver({recipients, subject, body})`, keeps an outbox. |
| `src/EmailAdapter.js` | Adapter **Adapter**: extends `NotificationSender`, translates into `EmailService`. |
| `src/Fine.js` | Fine lifecycle: `pay()`, `waive()`, `isPaid()`, `isWaived()`, `isSettled()`, `getAmount()`. |
| `src/ReminderScheduler.js` | `checkOverdueLoans(today)`, `checkExpiredHolds(today)`. |
| `docs/uml/seq-return.puml` | Return sequence diagram, rewritten for the implemented code. |
| `docs/report/adapter-section.md` | My Adapter section for the final report. |
| `docs/defense/study-guide.md` | My defense preparation material. |
| `tests/*.test.js` | Plain Node tests: `node tests/adapter.test.js` (no framework, no package.json). |

Branch `feature/lorand-circulation-return` (stacked on the branch above) contains my three methods in
`src/CirculationController.js` — `returnCopy()`, `payFine()`, `waiveFine()` — plus `tests/circulation.test.js`.

---

## For Erion

### 1. `Loan.js` — `createFine()` is still an empty stub (required)

`returnCopy()` calls `loan.createFine(amount)` and uses the returned `Fine`. Until this lands, a late return
records no fine (my tests use a double with exactly this implementation).

```js
import { Fine } from "./Fine.js";

// in the constructor:
this.fine = null;

createFine(amount) {
    this.fine = new Fine(amount);
    return this.fine;
}

getFine() {
    return this.fine;
}
```

### 2. `main.js` — required wiring

```js
import { LibrarySettings } from "./LibrarySettings.js";
import { EmailService } from "./EmailService.js";
import { EmailAdapter } from "./EmailAdapter.js";
import { ReminderScheduler } from "./ReminderScheduler.js";
import { CirculationController } from "./CirculationController.js";
// + Catalog, StudentController, CollectionController, HoldNotifier (Elion), LibraryRenderer (Dren)

const settings = LibrarySettings.getInstance();          // one shared Singleton for everybody
const sender = new EmailAdapter(new EmailService("no-reply@library.example"));
const holdNotifier = new HoldNotifier(sender);           // Elion's class, see below

const circulation = new CirculationController(catalog, settings, holdNotifier);
const scheduler = new ReminderScheduler(catalog, settings, sender, holdNotifier);
```

**Important:** the third argument of `CirculationController` is the object that responds to
`notify(reservation)` — wire the `HoldNotifier` there, **not** the `EmailAdapter`. The controller must not
send email itself; `HoldNotifier` does, through the adapter. `ReminderScheduler` takes both: `sender`
(a `NotificationSender`, used for the daily overdue emails) and the same `holdNotifier`.

### 3. Daily run

Whoever owns the UI should call, once a day:

```js
scheduler.checkOverdueLoans(new Date());
scheduler.checkExpiredHolds(new Date());
```

Repeated runs on the same day do not resend an overdue reminder for the same loan (the scheduler records
the day it notified), and an expired hold is processed once because `Reservation.expire()` changes its
status out of the set `Catalog.findExpiredHolds()` returns.

### 4. Class diagram changes you own (`class-diagram.puml`, `plantuml-diagram.svg`)

- Replace class `EmailSender` with:
  - `NotificationSender` — abstract, `+ sendTo(to: String, message: String)` (body throws),
  - `EmailAdapter` — `- service: EmailService`, `+ sendTo(to: String, message: String)`, generalization to `NotificationSender`,
  - `EmailService` — `- fromAddress: String`, `- outbox`, `+ deliver(mail)`.
- Replace associations:
  - `ReminderScheduler "1" -- "1" EmailSender` → `ReminderScheduler "1" -- "1" NotificationSender`,
  - `CirculationController "1" -- "1" EmailSender` → `CirculationController "1" -- "1" HoldNotifier`,
  - add `HoldNotifier "1" -- "1" NotificationSender` and `EmailAdapter "1" -- "1" EmailService`.
- `Fine`: add `+ getAmount(): double`, `+ isPaid(): boolean`, `+ isWaived(): boolean`, `+ isSettled(): boolean`,
  and change `pay()` / `waive()` to `: boolean` — they return `false` and change nothing when the fine is
  already settled (my implementation, so the desk can report success or refusal).
- `CirculationController`: `payFine(f: Fine): boolean`, `waiveFine(f: Fine): boolean`; `returnCopy(barcode): Fine`
  stays as agreed (returns the new `Fine`, or `null`).
- `ReminderScheduler`: add the `- overdueNotices` record used for the once-a-day rule.
- Add Elion's `HoldObserver` / `HoldNotifier` (not present in the Part 1 diagram).

---

## For Elion

### The shared notification interface my code calls

Whatever object is wired as `notifier` must expose exactly one method:

```js
notify(reservation)      // the reservation that has just received a hold
```

I call it in two places, always **after** `reservation.hold(holdDueDate, copy)` has succeeded, so only
students who really received a hold are notified:

- `CirculationController.returnCopy()` — when a returned copy is given to the next student in line,
- `ReminderScheduler.checkExpiredHolds()` — when an expired hold passes to the next student.

### Suggested `HoldNotifier` (yours to implement)

```js
import { NotificationSender } from "./NotificationSender.js";

export class HoldNotifier {
    constructor(sender) {              // a NotificationSender, e.g. new EmailAdapter(...)
        this.sender = sender;
    }

    notify(reservation) {
        const student = reservation.getStudent();
        const copy = reservation.getCopy();
        this.sender.sendTo(student.getEmail(),
            `Your reserved copy of ${copy.getBook().title} is ready for pickup`);
    }
}
```

If you prefer a classic subject with `attach`/`detach` and a list of observers, that is equally fine: the
object Erion wires as `notifier` must still answer `notify(reservation)`, and none of my call sites change.

### What my code calls on your classes

- `Reservation.hold(holdDueDate, copy)` — associate the copy and make it unavailable (status `on hold`).
- `Reservation.getStudent()` / `Reservation.getCopy()`.
- `Reservation.expire(today)` — release the hold so the copy can go back on the shelf. I read `getCopy()`
  **before** calling `expire()`, so you may keep or clear the copy reference afterwards.
- `Book.nextReservation()` — return the **next eligible** reservation in reservation order: status `waiting`
  only (never one that is on hold, completed, cancelled or expired), or `null`. I call it only after the
  expired hold has been released, so an expired reservation is never handed the same copy twice.
- `StudentController` — please route the "your copy is ready" mail through the same notifier/adapter instead
  of an `EmailSender`, so the whole system has one notification path.

---

## For Dren

### `Copy` — availability follows from the loan

`returnCopy()` does not call a "make available" method; the closed loan is what frees the copy:

```js
currentLoan() {
    return this.loan && !this.loan.returnedDate ? this.loan : null;   // null once the loan is closed
}

isAvailable() {
    return !this.damaged && !this.heldFor && this.currentLoan() === null;
}
```

- `heldFor` is set by `Reservation.hold(...)` and cleared by `Reservation.expire(...)` (confirm with Elion),
  so a copy is never available and reserved at the same time.
- `getStatus()` keeps the Part 1 order: damaged → on hold → on loan → available.
- `getBook()` must return the owning book — `returnCopy()` uses it to reach the reservation queue.

### `Catalog`

- `findCopy(barcode)` → `Copy` or `null`; `findBook(isbn)` → `Book` or `null`.
- `findOverdueLoans(today)` → loans that are not returned and are past their due date. My scheduler also
  re-checks `returnedDate` and `isOverdue(today)`, so extra filtering there is harmless.
- `findExpiredHolds(today)` → reservations with status `on hold` and `holdDueDate < today`.

### `LibraryRenderer` / `index.html`

```js
const copy = catalog.findCopy(barcode);
const hadLoan = copy !== null && copy.currentLoan() !== null;
const fine = circulation.returnCopy(barcode);      // Fine | null
const paid = circulation.payFine(fine);            // true | false
const waived = circulation.waiveFine(fine);        // true | false
scheduler.checkOverdueLoans(new Date());           // daily run
scheduler.checkExpiredHolds(new Date());           // daily run
```

- To report the result honestly: `copy === null` → "unknown barcode"; `!hadLoan` → "refused, no open loan";
  otherwise the return was recorded, and `fine !== null` means a fine was created (show the amount).
- `payFine` / `waiveFine` return `false` when the fine is missing or already settled — show that message
  rather than doing nothing.
- No mail may be sent from the renderer: hold notifications happen inside `notify(reservation)`.
