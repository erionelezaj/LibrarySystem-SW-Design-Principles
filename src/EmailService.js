export class EmailService {
    constructor(fromAddress) {
        this.fromAddress = fromAddress;
        this.outbox = [];
    }

    deliver(mail) {
        const record = {
            from: this.fromAddress,
            recipients: mail.recipients,
            subject: mail.subject,
            body: mail.body
        };
        this.outbox.push(record);
        console.log(`[EmailService] from=${record.from} to=${record.recipients.join(", ")} subject="${record.subject}" body="${record.body}"`);
        return record;
    }
}
