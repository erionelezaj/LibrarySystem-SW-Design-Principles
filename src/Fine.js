export class Fine {
    constructor(amount) {
        this.amount = amount;
        this.paid = false;
        this.waived = false;
    }

    getAmount() {
        return this.amount;
    }

    isPaid() {
        return this.paid;
    }

    isWaived() {
        return this.waived;
    }

    isSettled() {
        return this.paid || this.waived;
    }

    pay() {
        if (this.isSettled()) {
            return false;
        }
        this.paid = true;
        return true;
    }

    waive() {
        if (this.isSettled()) {
            return false;
        }
        this.waived = true;
        return true;
    }
}
