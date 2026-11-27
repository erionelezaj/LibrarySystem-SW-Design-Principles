import { Loan } from "./Loan.js";

export class Copy {
    constructor(barcode, book) {
        this.barcode = barcode;
        this.damaged = false;
        this.book = book;
        this.loans = [];
    }

    isAvailable() {
        return !this.damaged && !this.isInUse();
    }

    lendTo(s, dueDate) {
        if (!this.canLendTo(s)) {
            return null;
        }

        const loan = new Loan(s, dueDate);
        const studentLoans = s.getLoans();
        const reservation = this.#activeHold();

        if (reservation) {
            reservation.complete();
        }

        this.loans.push(loan);
        studentLoans.push(loan);

        return loan;
    }

    currentLoan() {
        return this.loans.find(loan => loan.returnedDate === null) ?? null;
    }

    markDamaged() {
        if (this.currentLoan()) {
            return false;
        }

        this.damaged = true;
        return true;
    }

    canLendTo(s) {
        if (!s || this.damaged || this.currentLoan()) {
            return false;
        }

        const reservation = this.#activeHold();
        return !reservation || reservation.getStudent() === s;
    }

    isInUse() {
        return this.currentLoan() !== null || this.#activeHold() !== null;
    }

    getBook() {
        return this.book;
    }

    getStatus() {
        if (this.damaged) {
            return "Damaged";
        }

        if (this.currentLoan()) {
            return "On loan";
        }

        if (this.#activeHold()) {
            return "On hold";
        }

        return "Available";
    }

    #activeHold() {
        return this.book.getReservations()
            .find(reservation => reservation.getCopy() === this) ?? null;
    }
}
