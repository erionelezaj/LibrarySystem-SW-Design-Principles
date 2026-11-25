export class ReminderScheduler {
    constructor(catalog, settings, sender, notifier) {
        this.catalog = catalog;
        this.settings = settings;
        this.sender = sender;
        this.notifier = notifier;
        this.overdueNotices = [];
    }

    checkOverdueLoans(today) {
        const loans = this.catalog.findOverdueLoans(today);
        for (const loan of loans) {
            if (loan.returnedDate) {
                continue;
            }
            if (!loan.isOverdue(today)) {
                continue;
            }
            if (this.wasNoticed(loan, today)) {
                continue;
            }
            const student = loan.getStudent();
            const message = `Your loan was due on ${loan.dueDate.toDateString()} and is overdue. Please return it to the library.`;
            this.sender.sendTo(student.getEmail(), message);
            this.overdueNotices.push({ loan: loan, day: today.toDateString() });
        }
    }

    checkExpiredHolds(today) {
        const reservations = this.catalog.findExpiredHolds(today);
        for (const reservation of reservations) {
            const copy = reservation.getCopy();
            reservation.expire(today);
            if (!copy) {
                continue;
            }
            const next = copy.getBook().nextReservation();
            if (next) {
                const holdDueDate = this.settings.calculateHoldDueDate(today);
                next.hold(holdDueDate, copy);
                this.notifier.notify(next);
            }
        }
    }

    wasNoticed(loan, today) {
        const day = today.toDateString();
        return this.overdueNotices.find(entry => entry.loan === loan && entry.day === day) !== undefined;
    }
}
