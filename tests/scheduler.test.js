import assert from "node:assert";
import { ReminderScheduler } from "../src/ReminderScheduler.js";
import { EmailAdapter } from "../src/EmailAdapter.js";
import { EmailService } from "../src/EmailService.js";
import { LibrarySettings } from "../src/LibrarySettings.js";
import { FakeBook, FakeCatalog, FakeNotifier, FakeSender, FakeStudent, TestLoan } from "./fakes.js";

const settings = LibrarySettings.getInstance();
const today = new Date(2026, 10, 25);
const overdueDate = new Date(2026, 10, 15);
const futureDate = new Date(2026, 11, 5);

// A catalog that returns whatever the test hands it, so the scheduler's own
// filtering can be checked instead of the catalog's.
class StubCatalog {
    constructor() {
        this.overdue = [];
    }
    findOverdueLoans() {
        return this.overdue;
    }
    findExpiredHolds() {
        return [];
    }
}

const sara = new FakeStudent("Sara", "sara@rit.edu");
const overdueLoan = new TestLoan(sara, overdueDate);
const returnedLoan = new TestLoan(sara, overdueDate);
returnedLoan.close(new Date(2026, 10, 20));
const currentLoan = new TestLoan(sara, futureDate);

// 1. An overdue, unreturned loan produces one reminder.
const catalog = new StubCatalog();
const sender = new FakeSender();
const notifier = new FakeNotifier();
const scheduler = new ReminderScheduler(catalog, settings, sender, notifier);
catalog.overdue = [overdueLoan];

scheduler.checkOverdueLoans(today);
assert.strictEqual(sender.messages.length, 1);
assert.strictEqual(sender.messages[0].to, "sara@rit.edu");
assert.ok(sender.messages[0].message.includes("overdue"));

// 2. Running again the same day must not repeat the reminder.
scheduler.checkOverdueLoans(today);
assert.strictEqual(sender.messages.length, 1, "one reminder per loan per day");

// 3. The next day the reminder is sent again.
const nextDay = new Date(2026, 10, 26);
scheduler.checkOverdueLoans(nextDay);
assert.strictEqual(sender.messages.length, 2);

// 4. A returned loan is ignored even if the catalog offers it.
catalog.overdue = [returnedLoan];
scheduler.checkOverdueLoans(today);
assert.strictEqual(sender.messages.length, 2, "returned loans must not be reminded");

// 5. A loan that is not overdue is ignored.
catalog.overdue = [currentLoan];
scheduler.checkOverdueLoans(today);
assert.strictEqual(sender.messages.length, 2, "only overdue loans are reminded");

// 6. The reminder reaches the provider through the adapter.
const service = new EmailService("no-reply@library.example");
const adapted = new ReminderScheduler(catalog, settings, new EmailAdapter(service), notifier);
catalog.overdue = [new TestLoan(sara, overdueDate)];
adapted.checkOverdueLoans(today);
assert.strictEqual(service.outbox.length, 1);
assert.deepStrictEqual(service.outbox[0].recipients, ["sara@rit.edu"]);
assert.ok(service.outbox[0].body.includes("overdue"));

// 7. An expired hold is released, the next student in line gets the copy and is notified.
const holdCatalog = new FakeCatalog();
const book = holdCatalog.addBook(new FakeBook("Refactoring", "978-1"));
const copy = book.addCopy("C-1");
const holdScheduler = new ReminderScheduler(holdCatalog, settings, sender, notifier);

const first = book.reserve(sara);
first.hold(settings.calculateHoldDueDate(new Date(2026, 10, 20)), copy);
const second = book.reserve(new FakeStudent("Dren", "dren@rit.edu"));

assert.strictEqual(copy.isAvailable(), false, "a held copy is not available");
holdScheduler.checkExpiredHolds(today);
assert.strictEqual(first.status, "expired");
assert.strictEqual(second.status, "on hold");
assert.strictEqual(second.getCopy(), copy);
assert.strictEqual(copy.heldFor, second);
assert.strictEqual(copy.isAvailable(), false, "a held copy must not become available");
assert.strictEqual(second.holdDueDate.getTime(), settings.calculateHoldDueDate(today).getTime());
assert.strictEqual(notifier.notifications.length, 1, "only the new holder is notified");
assert.strictEqual(notifier.notifications[0], second);

// 8. Running the scheduler again must not re-assign or re-notify.
holdScheduler.checkExpiredHolds(today);
assert.strictEqual(notifier.notifications.length, 1, "no duplicate hold assignment");
assert.strictEqual(notifier.notifications[0], second);

// 9. With nobody waiting, the copy simply goes back on the shelf.
const emptyBook = holdCatalog.addBook(new FakeBook("Clean Code", "978-2"));
const freeCopy = emptyBook.addCopy("C-2");
const lonely = emptyBook.reserve(sara);
lonely.hold(settings.calculateHoldDueDate(new Date(2026, 10, 20)), freeCopy);
const before = notifier.notifications.length;

holdScheduler.checkExpiredHolds(today);
assert.strictEqual(lonely.status, "expired");
assert.strictEqual(freeCopy.heldFor, null);
assert.strictEqual(freeCopy.isAvailable(), true, "the copy goes back on the shelf");
assert.strictEqual(notifier.notifications.length, before, "nobody to notify");

console.log("scheduler.test.js: all assertions passed");
