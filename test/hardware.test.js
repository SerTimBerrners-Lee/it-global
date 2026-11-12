import assert from "node:assert/strict";
import test from "node:test";
import { defaultConfiguration, evaluateConfiguration } from "../dist/hardware/configuration.js";
import { validateInfrastructureRequest, formatInfrastructureRequest } from "../server/infrastructure-request.js";

test("physical server configuration calculates nominal capacity for supported arrays", () => {
  for (const [raid, diskCount, expected] of [["none", 4, 8], ["raid1", 2, 2], ["raid5", 4, 6], ["raid6", 4, 4], ["raid10", 4, 4]]) {
    const result = evaluateConfiguration({ ...defaultConfiguration, raid, diskCount });

    assert.ok(result.ok);
    assert.equal(result.rawTb, diskCount * 2);
    assert.equal(result.usableTb, expected);
  }
});

test("physical server configuration rejects incomplete, unsupported and incompatible parameters", () => {
  for (const change of [
    { cores: "16" }, { ram: 63 }, { ram: NaN }, { diskSize: -1 }, { users: 0 }, { users: 1.5 },
    { diskCount: 25 }, { diskCount: 3, raid: "raid10" }, { diskCount: 4, raid: "raid1" },
    { diskCount: 2, raid: "raid5" }, { diskCount: 3, raid: "raid6" },
    { budget: Infinity }, { budget: -1 }, { purpose: "toString" }, { gpu: "unknown" }, { diskType: "__proto__" },
  ]) assert.equal(evaluateConfiguration({ ...defaultConfiguration, ...change }).ok, false);

  for (const value of [null, [], "server", 1, {}]) assert.equal(evaluateConfiguration(value).ok, false);
});

test("hardware email contains validated configuration and contact with recalculated capacity", () => {
  const data = validateInfrastructureRequest({
    kind: "hardware", name: "Анна", contact: "anna@example.com", serviceIds: ["hardware-sizing"],
    configuration: { ...defaultConfiguration, ram: 128, usableTb: 999999, recipient: "attacker@example.com" },
  });
  const mail = formatInfrastructureRequest(data);

  assert.match(mail.subject, /\/hardware\//);
  assert.match(mail.text, /Email: anna@example.com/);
  assert.match(mail.text, /ОЗУ: 128 ГБ/);
  assert.match(mail.text, /Номинальный полезный объём: 4 ТБ/);
  assert.doesNotMatch(mail.text, /999999|attacker|9 900|49 900/);
  assert.equal(Object.hasOwn(data.configuration, "usableTb"), false);
  assert.throws(() => validateInfrastructureRequest({ ...data, kind: "infrastructure" }));
  assert.throws(() => validateInfrastructureRequest({ ...data, configuration: { ...defaultConfiguration, diskCount: 3 } }));
});

test("hardware consultation does not invent a configuration or equipment price", () => {
  const data = validateInfrastructureRequest({ kind: "hardware", name: "Тест", contact: "+7 999 123-45-67", serviceIds: [] });
  const mail = formatInfrastructureRequest(data);

  assert.equal(data.configuration, null);
  assert.doesNotMatch(mail.text, /ОЗУ:|ядер|Цена:|9 900|49 900/);
});
