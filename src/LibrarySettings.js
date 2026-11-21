export class LibrarySettings {
    static instance = null;

    constructor() {
        if (LibrarySettings.instance !== null) {
            throw new Error("Use LibrarySettings.getInstance()");
        }
        LibrarySettings.instance = this;
        this.loanPeriod = 7;
        this.holdPeriod = 2;
        this.fineRate = 0.50;
    }
    static getInstance() {
        if (LibrarySettings.instance === null) {
            new LibrarySettings();
        }
        return LibrarySettings.instance;
    }

    update(loanPeriod, holdPeriod, fineRate) {
        this.loanPeriod=loanPeriod;
        this.holdPeriod=holdPeriod;
        this.fineRate=fineRate;
    }

    addDays(start,days){
        const result = new Date(start);

        result.setDate(result.getDate() + days);

        return result;
    }

    calculateLoanDueDate(start) {
        return this.addDays(start,this.loanPeriod);
    }

    calculateHoldDueDate(start) {
        return this.addDays(start, this.holdPeriod);
    }

    calculateFine(daysLate) {
        return daysLate * this.fineRate;
    }
}