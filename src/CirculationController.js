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
        // Lorand's part
    }

    waiveFine(fine) {
        // Lorand's part
    }
    payFine(fine) {
        // Lorand's part
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