import {Fine} from "./Fine.js";

export class Loan {
    constructor(student, dueDate){
        this.student= student;
        this.dueDate = dueDate;
        this.startDate = new Date();
        this.returnedDate = null;
        this.fine = null;
    }
    close(today){
        this.returnedDate = today;
    }
    isOverdue(today){
    if(this.daysLate(today)>0){
        return true;
    }
    return false;
    }
    daysLate(today){
        const start = new Date(today);
        const end = new Date(this.dueDate);

        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);

        const difference = start.getTime() - end.getTime();

        return Math.round(difference /(1000*60*60*24));
    }
    createFine(amount){
        return this.fine = new Fine(amount);
    }
    getFine(){
        return this.fine;
    }
    getStudent(){
        return this.student;
    }
}