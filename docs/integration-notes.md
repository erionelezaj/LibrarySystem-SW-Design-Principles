# Integration notes — Lorand's Part 2 contribution

## Review on 26 November 2026

Not ready to merge. Remote branch heads match the local tracking refs. No Elion implementation is published on these branches; Dren's branches contain planning work, not the missing domain/UI classes. No teammate-owned file has been changed.

## Observer contract for Elion and wiring for Erion

Book is the Subject and owns subscribe(observer), notify(reservation), and nextReservation(). HoldObserver is the abstraction; HoldNotifier implements it and depends on NotificationSender.sendTo(to, message). Controllers and the scheduler call book.notify(reservation), never HoldNotifier directly.

Proposed payload pending Elion's confirmation: notify(reservation) forwards that reservation to each subscribed observer's notify(reservation). No actual implementation exists to verify this signature against. Register one HoldNotifier per Book using book.subscribe(holdNotifier) when the Book is added/loaded, including future books. Do not subscribe again on each return or daily run.

The sequence is nextReservation() → reservation.hold(holdDueDate, copy) → book.notify(reservation). hold() must associate the copy and make it unavailable before returning; false means refusal, void means success, and an exception stops notification. Both return and expiry workflows follow this contract. Book chooses the first waiting reservation; clients must not reproduce queue filtering. Reservation.expire(today) must release the copy before the next hold is attempted. Confirm this contract with Elion before integration.

Erion: retain existing constructor argument counts for compatibility for now, but the legacy notifier arguments are unused by Lorand's methods. Wire NotificationSender into the scheduler for overdue reminders, and into HoldNotifier for hold messages. Removing unused constructor parameters requires agreement because the controller constructor is yours.

## Fine creation — blocker for Erion

Loan.createFine(amount) is empty. Import Fine from ./Fine.js; initialize this.fine = null in Loan's constructor; implement createFine(amount) as this.fine = new Fine(amount); return this.fine; add getFine() returning this.fine. Student.getFines() must collect the student's loan fines so the desk can find them later.

The corrected controller calculates the amount and calls createFine BEFORE closing a late loan. If no fine is returned, it throws an integration error and leaves the loan open; no hold or notification occurs. This exposes the stub rather than recording a fine-free late return. The controller relies on Loan to own the association; it does not create Fine itself. Loan.daysLate(today) and isOverdue(today) must remain usable before closing.

## Date policy — blocker for Erion

Add LibrarySettings.isSameDay(first, second), comparing local calendar year, month and day. The scheduler delegates reminder deduplication to it and stores a copy of the date. No date normalization or calendar comparison remains in the scheduler. The test helper temporarily supplies this method; it is not present in production settings yet.

Loan.daysLate() currently contains date arithmetic outside LibrarySettings. Move that arithmetic to a settings method with the same calendar-day semantics and have Loan delegate, preserving Loan.daysLate(today). Review expiry comparison in Catalog/Reservation for the same requirement when those classes arrive. These are owner changes, not implemented here.

## Return contract and UI — Dren / team

The original class diagram explicitly specifies returnCopy(barcode: String): Fine. Preserve Fine | null. Null means either a refused return or a successful on-time return. Before calling, inspect whether the copy has an open loan; after calling, inspect returnedDate, and show success only if that loan closed. Catch the missing-fine error and report that the return was not recorded. Do not infer success solely from a null result. Any richer result object requires team approval; no signature change was made.

Copy.currentLoan() must exclude closed loans; getBook() returns its Book. Copy availability accounts for damage, holds and open loans. Catalog supplies findCopy(), findBook(), findOverdueLoans(today) and findExpiredHolds(today). Expired-hold lookup must exclude reservations already expired. The daily UI job calls checkOverdueLoans(today) and checkExpiredHolds(today). No renderer code or HTML exists yet, so browser testing is blocked.

## Diagram updates — Erion

Update the shared class diagram and SVG: NotificationSender Target; EmailAdapter extends it and wraps EmailService; ReminderScheduler and HoldNotifier depend on NotificationSender; Book owns HoldObserver subscriptions; HoldNotifier implements HoldObserver. Remove direct controller → EmailSender/HoldNotifier delivery associations. Add LibrarySettings.isSameDay(), Loan.getFine(), and Fine lifecycle query/boolean methods. The return diagram distinguishes implemented controller calls from pending owner contracts.

## Validation and branch placement

Adapter/Fine tests use real own classes. Scheduler and return workflow tests use temporary Book/Copy/Reservation/Catalog/Student/Observer doubles. Real Loan tests expose the empty createFine blocker. A passing double-based workflow is not full integration. Run every tests/*.test.js with Node after integration. Test actual queues, holds and Observer delivery again once owner classes land, then run the website.

Shared scheduler, doubles and documentation corrections belong to feature/lorand-part2 (PR #5). Controller methods and circulation tests belong to feature/lorand-circulation-return (PR #6, based on #5). Neither PR should be merged until blockers are resolved and Elion reviews the Observer contract.

GitHub associates the existing Guy / lorand.pervizaj@gmail.com commits with LorandPervizaj. Identity and commit history are unchanged. PR descriptions still describe the old direct notifier design until updated; use these notes for the corrected contract.
