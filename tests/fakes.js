import { Loan } from "../src/Loan.js";
import { Fine } from "../src/Fine.js";

// Loan.createFine() is still an empty stub in src/Loan.js, which Erion owns.
// TestLoan mirrors the implementation Erion has to add, so the return workflow
// can be tested before that change lands.
export class TestLoan extends Loan {
    createFine(amount) {
        this.fine = new Fine(amount);
        return this.fine;
    }
}

export class FakeStudent {
    constructor(name, email) {
        this.name = name;
        this.email = email;
    }
    getEmail() {
        return this.email;
    }
    getFines() {
        return [];
    }
}

export class FakeReservation {
    constructor(student) {
        this.student = student;
        this.status = "waiting";
        this.holdDueDate = null;
        this.copy = null;
    }
    hold(holdDueDate, copy) {
        this.holdDueDate = holdDueDate;
        this.copy = copy;
        this.status = "on hold";
        copy.heldFor = this;
    }
    expire(today) {
        this.status = "expired";
        if (this.copy) {
            this.copy.heldFor = null;
            this.copy = null;
        }
    }
    cancel() {
        this.status = "cancelled";
    }
    complete() {
        this.status = "completed";
    }
    getStudent() {
        return this.student;
    }
    getCopy() {
        return this.copy;
    }
}

export class FakeCopy {
    constructor(barcode, book) {
        this.barcode = barcode;
        this.book = book;
        this.loan = null;
        this.damaged = false;
        this.heldFor = null;
    }
    currentLoan() {
        return this.loan && !this.loan.returnedDate ? this.loan : null;
    }
    lendTo(student, dueDate) {
        this.loan = new TestLoan(student, dueDate);
        return this.loan;
    }
    getBook() {
        return this.book;
    }
    isAvailable() {
        return !this.damaged && !this.heldFor && this.currentLoan() === null;
    }
    isInUse() {
        return !this.isAvailable();
    }
    canLendTo(student) {
        return this.isAvailable();
    }
    markDamaged() {
        this.damaged = true;
    }
    getStatus() {
        if (this.damaged) {
            return "damaged";
        }
        if (this.heldFor) {
            return "on hold";
        }
        if (this.currentLoan()) {
            return "on loan";
        }
        return "available";
    }
}

export class FakeBook {
    constructor(title, isbn) {
        this.title = title;
        this.isbn = isbn;
        this.reservations = [];
        this.copies = [];
    }
    reserve(student) {
        const reservation = new FakeReservation(student);
        this.reservations.push(reservation);
        return reservation;
    }
    nextReservation() {
        return this.reservations.find(r => r.status === "waiting") || null;
    }
    getReservations() {
        return this.reservations;
    }
    addCopy(barcode) {
        const copy = new FakeCopy(barcode, this);
        this.copies.push(copy);
        return copy;
    }
    getCopies() {
        return this.copies;
    }
    findAvailableCopy() {
        return this.copies.find(c => c.isAvailable()) || null;
    }
}

export class FakeCatalog {
    constructor() {
        this.books = [];
    }
    addBook(book) {
        this.books.push(book);
        return book;
    }
    findBook(isbn) {
        return this.books.find(b => b.isbn === isbn) || null;
    }
    findCopy(barcode) {
        for (const book of this.books) {
            const copy = book.copies.find(c => c.barcode === barcode);
            if (copy) {
                return copy;
            }
        }
        return null;
    }
    findOverdueLoans(today) {
        const loans = [];
        for (const book of this.books) {
            for (const copy of book.copies) {
                const loan = copy.loan;
                if (loan && !loan.returnedDate && loan.isOverdue(today)) {
                    loans.push(loan);
                }
            }
        }
        return loans;
    }
    findExpiredHolds(today) {
        const expired = [];
        for (const book of this.books) {
            for (const reservation of book.reservations) {
                if (reservation.status === "on hold" && reservation.holdDueDate && reservation.holdDueDate < today) {
                    expired.push(reservation);
                }
            }
        }
        return expired;
    }
}

export class FakeNotifier {
    constructor() {
        this.notifications = [];
    }
    notify(reservation) {
        this.notifications.push(reservation);
    }
}

export class FakeSender {
    constructor() {
        this.messages = [];
    }
    sendTo(to, message) {
        this.messages.push({ to: to, message: message });
    }
}
