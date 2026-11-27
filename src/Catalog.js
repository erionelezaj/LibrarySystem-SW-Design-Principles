import { Book } from "./Book.js";
import { LibrarySettings } from "./LibrarySettings.js";

export class Catalog {
    constructor(holdNotifier) {
        this.books = [];
        this.holdNotifier = holdNotifier;
    }

    search(title) {
        const query = title.trim().toLowerCase();

        return this.books.filter(book =>
            !book.withdrawn && book.title.toLowerCase().includes(query)
        );
    }

    findCopy(barcode) {
        for (const book of this.books) {
            const copy = book.getCopies().find(copy => copy.barcode === barcode);

            if (copy) {
                return copy;
            }
        }

        return null;
    }

    findBook(isbn) {
        return this.books.find(book => book.isbn === isbn) ?? null;
    }

    addBook(title, isbn, author) {
        if (this.findBook(isbn)) {
            return null;
        }

        const book = new Book(title, isbn, author);
        book.subscribe(this.holdNotifier);
        this.books.push(book);

        return book;
    }

    findOverdueLoans(today) {
        const overdueLoans = [];

        for (const book of this.books) {
            for (const copy of book.getCopies()) {
                const loan = copy.currentLoan();

                if (loan && loan.isOverdue(today)) {
                    overdueLoans.push(loan);
                }
            }
        }

        return overdueLoans;
    }

    findExpiredHolds(today) {
        const expiredHolds = [];
        const settings = LibrarySettings.getInstance();

        for (const book of this.books) {
            for (const reservation of book.getReservations()) {
                const holdDueDate = reservation.holdDueDate;

                if (!reservation.getCopy() || !holdDueDate) {
                    continue;
                }

                if (holdDueDate < today && !settings.isSameDay(holdDueDate, today)) {
                    expiredHolds.push(reservation);
                }
            }
        }

        return expiredHolds;
    }
}
