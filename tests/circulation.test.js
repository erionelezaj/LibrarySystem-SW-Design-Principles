import assert from "node:assert";
import { CirculationController } from "../src/CirculationController.js";
import { Fine } from "../src/Fine.js";
import { LibrarySettings } from "../src/LibrarySettings.js";
import { FakeBook, FakeCatalog, FakeNotifier, FakeStudent } from "./fakes.js";

function setup() {
    const settings = LibrarySettings.getInstance();
    const catalog = new FakeCatalog();
    const notifier = new FakeNotifier();
    const controller = new CirculationController(catalog, settings, notifier);
    const book = catalog.addBook(new FakeBook("Refactoring", "978-1"));
    const copy = book.addCopy("C-1");
    const sara = new FakeStudent("Sara", "sara@rit.edu");
    return { settings, catalog, notifier, controller, book, copy, sara };
}

function startOfDay(date) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
}

// Returning on time: no fine, the loan is closed, the copy is back on the shelf.
{
    const { controller, copy, sara, notifier } = setup();
    const loan = controller.lendCopy("C-1", sara);
    assert.ok(loan, "lending must still work after the return changes");

    const fine = controller.returnCopy("C-1");
    assert.strictEqual(fine, null, "an on-time return has no fine");
    assert.ok(loan.returnedDate, "the loan must be closed");
    assert.strictEqual(copy.currentLoan(), null);
    assert.strictEqual(copy.isAvailable(), true);
    assert.strictEqual(notifier.notifications.length, 0, "nobody is waiting, nobody is notified");
}

// Returning late: the fine amount comes from LibrarySettings.
{
    const { settings, controller, copy, sara } = setup();
    const dueDate = settings.addDays(new Date(), -10);
    const loan = copy.lendTo(sara, dueDate);

    const fine = controller.returnCopy("C-1");
    assert.ok(fine, "a late return must produce a fine");
    assert.strictEqual(fine.getAmount(), settings.calculateFine(10));
    assert.strictEqual(fine.getAmount(), 5);
    assert.strictEqual(loan.returnedDate !== null, true);
    assert.strictEqual(copy.isAvailable(), true);
}

// Invalid returns are refused.
{
    const { controller } = setup();
    assert.strictEqual(controller.returnCopy("missing"), null, "unknown barcode");
}
{
    const { controller, copy, sara } = setup();
    assert.strictEqual(controller.returnCopy("C-1"), null, "a copy with no loan cannot be returned");
    copy.lendTo(sara, new Date());
    copy.loan.close(new Date());
    assert.strictEqual(controller.returnCopy("C-1"), null, "the same loan cannot be returned twice");
}

// Even a copy that keeps offering a closed loan must not record a second return.
{
    const { controller, copy, sara } = setup();
    const loan = copy.lendTo(sara, new Date());
    controller.returnCopy("C-1");
    const stubborn = { currentLoan: () => loan };
    const catalog = { findCopy: () => stubborn };
    const late = new CirculationController(catalog, LibrarySettings.getInstance(), new FakeNotifier());
    assert.strictEqual(late.returnCopy("C-1"), null);
}

// One student waiting: the copy is held, not available, and the holder is notified.
{
    const { settings, controller, book, copy, sara, notifier } = setup();
    const waiting = book.reserve(new FakeStudent("Dren", "dren@rit.edu"));
    controller.lendCopy("C-1", sara);

    const fine = controller.returnCopy("C-1");
    assert.strictEqual(fine, null);
    assert.strictEqual(waiting.status, "on hold");
    assert.strictEqual(waiting.getCopy(), copy);
    assert.strictEqual(copy.isAvailable(), false, "a held copy is not available");
    assert.strictEqual(startOfDay(waiting.holdDueDate), startOfDay(settings.calculateHoldDueDate(new Date())));
    assert.strictEqual(notifier.notifications.length, 1, "exactly one notification");
    assert.strictEqual(notifier.notifications[0], waiting, "the new holder is the recipient");
}

// Several students waiting: the first eligible one gets the copy.
{
    const { controller, book, copy, sara, notifier } = setup();
    const first = book.reserve(new FakeStudent("Dren", "dren@rit.edu"));
    const second = book.reserve(new FakeStudent("Elion", "elion@rit.edu"));
    controller.lendCopy("C-1", sara);

    controller.returnCopy("C-1");
    assert.strictEqual(first.status, "on hold");
    assert.strictEqual(first.getCopy(), copy);
    assert.strictEqual(second.status, "waiting", "the second student keeps waiting");
    assert.strictEqual(second.getCopy(), null);
    assert.strictEqual(notifier.notifications.length, 1);
    assert.strictEqual(notifier.notifications[0], first);
}

// A late return with somebody waiting: fine and hold are both handled.
{
    const { settings, controller, book, copy, sara, notifier } = setup();
    const waiting = book.reserve(new FakeStudent("Dren", "dren@rit.edu"));
    copy.lendTo(sara, settings.addDays(new Date(), -4));

    const fine = controller.returnCopy("C-1");
    assert.strictEqual(fine.getAmount(), settings.calculateFine(4));
    assert.strictEqual(waiting.status, "on hold");
    assert.strictEqual(copy.isAvailable(), false);
    assert.strictEqual(notifier.notifications.length, 1);
}

// Paying and waiving a fine are delegated to the fine itself.
{
    const { controller, sara } = setup();
    const fine = new Fine(3);
    assert.strictEqual(controller.payFine(fine), true);
    assert.strictEqual(fine.isPaid(), true);
    assert.strictEqual(controller.payFine(fine), false, "a paid fine cannot be paid again");
    assert.strictEqual(controller.waiveFine(fine), false, "a paid fine cannot be waived");

    const other = new Fine(2);
    assert.strictEqual(controller.waiveFine(other), true);
    assert.strictEqual(other.isWaived(), true);
    assert.strictEqual(controller.waiveFine(other), false, "a waived fine cannot be waived again");
    assert.strictEqual(controller.payFine(other), false, "a waived fine cannot be paid");

    assert.strictEqual(controller.payFine(null), false);
    assert.strictEqual(controller.waiveFine(null), false);
    assert.deepStrictEqual(controller.viewFines(sara), []);
}

console.log("circulation.test.js: all assertions passed");
