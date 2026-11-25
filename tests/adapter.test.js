import assert from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { NotificationSender } from "../src/NotificationSender.js";
import { EmailAdapter } from "../src/EmailAdapter.js";
import { EmailService } from "../src/EmailService.js";
import { FakeSender } from "./fakes.js";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

// 1. The abstraction cannot be used unimplemented.
const base = new NotificationSender();
assert.throws(() => base.sendTo("student@rit.edu", "hello"), /must be implemented/);

// 2. The adapter is a NotificationSender and reaches the provider.
const service = new EmailService("no-reply@library.example");
const adapter = new EmailAdapter(service);
assert.ok(adapter instanceof NotificationSender, "adapter must be a NotificationSender");

const result = adapter.sendTo("student@rit.edu", "Your reserved copy is ready");
assert.strictEqual(result, undefined, "sendTo() keeps the agreed void return");

assert.strictEqual(service.outbox.length, 1, "the message must reach the provider");
const mail = service.outbox[0];
assert.deepStrictEqual(mail.recipients, ["student@rit.edu"], "recipient must be translated");
assert.strictEqual(mail.from, "no-reply@library.example");
assert.strictEqual(mail.body, "Your reserved copy is ready", "message must be translated");
assert.strictEqual(typeof mail.subject, "string", "the provider needs a subject the abstraction does not have");

// 3. A compatible substitute can be injected into a client that only knows the abstraction.
class MessageClient {
    constructor(sender) {
        this.sender = sender;
    }
    send(to, message) {
        this.sender.sendTo(to, message);
    }
}

const withAdapter = new MessageClient(adapter);
withAdapter.send("student@rit.edu", "first");
assert.strictEqual(service.outbox.length, 2);

const substitute = new FakeSender();
const withSubstitute = new MessageClient(substitute);
withSubstitute.send("student@rit.edu", "second");
assert.deepStrictEqual(substitute.messages, [{ to: "student@rit.edu", message: "second" }]);
assert.strictEqual(service.outbox.length, 2, "the substitute must not touch the email provider");

// 4. No client may know about the provider; only the adapter receives it.
const files = readdirSync(srcDir).filter(f => f.endsWith(".js"));
const clients = files.filter(f => f !== "EmailService.js" && f !== "EmailAdapter.js");
const aware = clients.filter(f => readFileSync(join(srcDir, f), "utf8").includes("EmailService"));
assert.deepStrictEqual(aware, [], "clients must not depend on EmailService");

console.log("adapter.test.js: all assertions passed");
