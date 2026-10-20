import assert from "node:assert/strict";
import test from "node:test";
import { calculateEffect } from "../dist/ai/effect.js";
import { validateAiRequest, formatAiRequest } from "../server/ai-request.js";

/** @returns {Record<string, unknown>} */
function request() {
  return { kind: "ai", name: "Тест", phone: "+7 999 123-45-67", company: "Тестовое производство", message: "Помощник по инструкциям", serviceIds: ["knowledge", "tuning", "training"], deployment: "local" };
}

test("AI requests use verified service names without inherited catalog tariffs", () => {
  const data = validateAiRequest({ ...request(), price: 1, recipient: "attacker@example.com", title: "Forged" });
  const mail = formatAiRequest(data);

  assert.match(mail.subject, /внедрение LLM/);
  assert.match(mail.text, /Помощник по документам/);
  assert.match(mail.text, /Дообучение модели/);
  assert.match(mail.text, /Обучение сотрудников/);
  assert.match(mail.text, /В инфраструктуре компании/);
  assert.doesNotMatch(mail.text, /9 900|49 900|12 месяцев|attacker|Forged|Экономия/);
  assert.deepEqual(Object.keys(data), ["name", "phone", "message", "company", "serviceIds", "deployment"]);
});

test("AI request validation rejects unknown, duplicate or malformed services and placement", () => {
  for (const change of [
    { serviceIds: ["mail"] }, { serviceIds: ["tuning", "tuning"] }, { serviceIds: "knowledge" },
    { deployment: "toString" }, { deployment: "__proto__" }, { deployment: "anywhere" },
    { company: "A\nB" }, { company: "x".repeat(161) }, { name: "\nTest" },
    { phone: "123" }, { message: "x".repeat(3001) }, { kind: "services" },
  ]) {
    assert.throws(() => validateAiRequest({ ...request(), ...change }));
  }

  for (const value of [null, [], "request", 1]) assert.throws(() => validateAiRequest(value));
});

test("AI requests allow consultation without forcing a service or deployment", () => {
  const mail = formatAiRequest(validateAiRequest({ ...request(), serviceIds: [], deployment: "undecided", company: "", message: "" }));

  assert.match(mail.text, /Нужна помощь с подбором услуг/);
  assert.match(mail.text, /Подобрать подходящий вариант/);
  assert.match(mail.text, /Компания: Не указана/);
});

test("effect estimate accounts for human review, operating cost and upfront investment", () => {
  const result = calculateEffect({ volume: 1000, before: 15, after: 7, hourly: 800, operating: 30000, investment: 500000 });

  assert.ok(result);
  assert.ok(Math.abs(result.hours - 133.333333) < 0.001);
  assert.ok(Math.abs(result.net - 76666.666667) < 0.001);
  assert.ok(Math.abs(result.payback - 6.521739) < 0.001);
});

test("effect estimate does not promise payback when review takes longer or costs exceed capacity", () => {
  const base = { volume: 1000, before: 15, after: 20, hourly: 800, operating: 30000, investment: 500000 };
  const slower = calculateEffect(base);
  const noBenefit = calculateEffect({ ...base, after: 15, operating: 0 });

  assert.ok(slower.hours < 0);
  assert.ok(slower.net < 0);
  assert.equal(slower.payback, null);
  assert.equal(noBenefit.payback, null);
});

test("effect estimate rejects missing, negative, fractional volume and excessive inputs", () => {
  const base = { volume: 1000, before: 15, after: 7, hourly: 800, operating: 30000, investment: 500000 };

  for (const change of [{ volume: 0 }, { volume: 1.5 }, { before: NaN }, { after: -1 }, { hourly: Infinity }, { operating: 100000001 }, { investment: -1 }]) {
    assert.equal(calculateEffect({ ...base, ...change }), null);
  }
});
