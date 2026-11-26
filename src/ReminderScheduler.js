export class ReminderScheduler {
    constructor(catalog, settings, sender) {
        this.catalog = catalog;
        this.settings = settings;
        this.sender = sender;
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
            if (this.wasRemindedToday(loan, today)) {
                continue;
            }
            const student = loan.getStudent();
            const message = `Your loan was due on ${loan.dueDate.toDateString()} and is overdue. Please return it to the library.`;
            this.sender.sendTo(student.getEmail(), message);
            this.overdueNotices.push({ loan: loan, day: new Date(today) });
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
            const book = copy.getBook();
            const next = book.nextReservation();
            if (next) {
                const holdDueDate = this.settings.calculateHoldDueDate(today);
                if (next.hold(holdDueDate, copy) !== false) {
                    book.notify(next);
                }
            }
        }
    }

    wasRemindedToday(loan, today) {
        return this.overdueNotices.some(entry =>
            entry.loan === loan && this.settings.isSameDay(entry.day, today));
    }
}
