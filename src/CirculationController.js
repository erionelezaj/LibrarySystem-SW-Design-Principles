export class CirculationController {
    constructor(catalog, settings, notifier) {
        this.catalog = catalog;
        this.settings = settings;
        this.notifier = notifier;
    }
    lendCopy(barcode, student) {
        const copy = this.catalog.findCopy(barcode);
        if (!copy) {
            return null;
        } else {
            const canLend = copy.canLendTo(student);
            if (canLend) {
                const today = new Date();
                const dueDate = this.settings.calculateLoanDueDate(today);

                const loan = copy.lendTo(student, dueDate);
                return loan;
            } else {
                return null;
            }
        }
    }
    returnCopy(barcode) {
        const copy = this.catalog.findCopy(barcode);
        if (!copy) {
            return null;
        }
        const loan = copy.currentLoan();
        if (!loan || loan.returnedDate) {
            return null;
        }
        const today = new Date();
        loan.close(today);

        let fine = null;
        if (loan.isOverdue(today)) {
            const amount = this.settings.calculateFine(loan.daysLate(today));
            fine = loan.createFine(amount);
        }

        const next = copy.getBook().nextReservation();
        if (next) {
            const holdDueDate = this.settings.calculateHoldDueDate(today);
            next.hold(holdDueDate, copy);
            this.notifier.notify(next);
        }

        return fine;
    }

    waiveFine(fine) {
        if (!fine) {
            return false;
        }
        return fine.waive();
    }
    payFine(fine) {
        if (!fine) {
            return false;
        }
        return fine.pay();
    }

    viewFines(student) {
        return student.getFines();
    }

    viewBookReservations(isbn) {
        const book = this.catalog.findBook(isbn);
        if(!book){
            return null;
        } else {
            return book.getReservations();
        }
    }
}