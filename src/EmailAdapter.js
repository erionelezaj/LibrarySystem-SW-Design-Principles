import { NotificationSender } from "./NotificationSender.js";

const SUBJECT = "Library notification";

export class EmailAdapter extends NotificationSender {
    constructor(service) {
        super();
        this.service = service;
    }

    sendTo(to, message) {
        this.service.deliver({
            recipients: [to],
            subject: SUBJECT,
            body: message
        });
    }
}
