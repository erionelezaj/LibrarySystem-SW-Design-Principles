export class Student {
    constructor(fullName, studentId, email) {
        this.fullName = fullName;
        this.studentId = studentId;
        this.email = email;
        this.loans = [];
        this.reservations = [];
    }

    getLoans() {
        return this.loans;
    }

    getReservations() {
        return this.reservations;
    }

    getFines() {
        const fines = [];

        for (const loan of this.loans) {
            const fine = loan.getFine?.();

            if (fine != null) {
                fines.push(fine);
            }
        }

        return fines;
    }

    getEmail() {
        return this.email;
    }
}
