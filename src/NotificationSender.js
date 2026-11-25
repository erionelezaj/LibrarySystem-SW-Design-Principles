export class NotificationSender {
    sendTo(to, message) {
        throw new Error("sendTo() must be implemented by a notification sender");
    }
}
