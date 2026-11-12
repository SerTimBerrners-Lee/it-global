import assert from "node:assert/strict";
import test from "node:test";
import { parseContact } from "../dist/contact.js";
import { validateContact } from "../server/request.js";

test("one contact field accepts either a phone or an email and detects its type", () => {
  assert.deepEqual(parseContact(" +7 (999) 123-45-67 "), { value: "+7 (999) 123-45-67", type: "phone" });
  assert.deepEqual(parseContact(" anna+server@example.com "), { value: "anna+server@example.com", type: "email" });
  assert.equal(validateContact({ name: "Анна", contact: "anna@example.com", contactType: "phone" }).contactType, "email");
  assert.equal(validateContact({ name: "Анна", phone: "+79991234567" }).contact, "+79991234567");
});

test("contact validation rejects invalid addresses, both contacts together and control characters", () => {
  for (const contact of [undefined, null, 1, "", "123", "user@", "a@-example.com", "a..b@example.com", "a@example..com", "a@example.com\r\nBcc: a@example.org", "\na@example.com", "a@example.com +79991234567", "a".repeat(65) + "@example.com"]) {
    assert.equal(parseContact(contact), null);
    assert.throws(() => validateContact({ name: "Анна", contact }));
  }
});
