import assert from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Fine } from "../src/Fine.js";
import { LibrarySettings } from "../src/LibrarySettings.js";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const settings = LibrarySettings.getInstance();

// The amount comes from LibrarySettings, never from the fine itself.
const amount = settings.calculateFine(3);
assert.strictEqual(amount, 3 * 0.50);
const fine = new Fine(amount);
assert.strictEqual(fine.getAmount(), 1.5);
assert.strictEqual(fine.isPaid(), false);
assert.strictEqual(fine.isWaived(), false);
assert.strictEqual(fine.isSettled(), false);

// Recording a payment.
assert.strictEqual(fine.pay(), true);
assert.strictEqual(fine.isPaid(), true);
assert.strictEqual(fine.isSettled(), true);

// A paid fine cannot be waived, and paying it twice changes nothing.
assert.strictEqual(fine.waive(), false);
assert.strictEqual(fine.isWaived(), false);
assert.strictEqual(fine.pay(), false);
assert.strictEqual(fine.isPaid(), true);

// A waived fine cannot be paid.
const other = new Fine(2.5);
assert.strictEqual(other.waive(), true);
assert.strictEqual(other.isWaived(), true);
assert.strictEqual(other.pay(), false);
assert.strictEqual(other.isPaid(), false);
assert.strictEqual(other.isWaived(), true);

// The fine rate only changes through LibrarySettings.
settings.update(7, 2, 0.75);
assert.strictEqual(settings.calculateFine(3), 2.25);
settings.update(7, 2, 0.50);

// No other source file may carry a policy value.
const files = readdirSync(srcDir).filter(f => f.endsWith(".js"));
const offenders = files.filter(f => f !== "LibrarySettings.js" &&
    /fineRate|loanPeriod|holdPeriod|0\.50/.test(readFileSync(join(srcDir, f), "utf8")));
assert.deepStrictEqual(offenders, [], "policy values belong to LibrarySettings only");

console.log("fine.test.js: all assertions passed");
