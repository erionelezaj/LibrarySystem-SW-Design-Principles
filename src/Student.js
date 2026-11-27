export class Student {
    constructor(name, email) {
        this.name = name;
        this.email = email;
        this.loans = [];
        this.reservations = [];
    }

    getEmail() {
        return this.email;
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
}
