import assert from "node:assert/strict";
import test from "node:test";
import { validateInfrastructureRequest, formatInfrastructureRequest } from "../server/infrastructure-request.js";

/** @returns {Record<string, unknown>} */
function request() {
  return {
    kind: "infrastructure", name: "Тест", phone: "+7 (999) 123-45-67",
    message: "Перенести базы из ЦОДа на площадку компании в Санкт-Петербурге.",
    serviceIds: ["cloud-migration", "ai-server", "backup-recovery"],
  };
}

test("infrastructure mail uses trusted service names and does not inherit software tariffs", () => {
  const validated = validateInfrastructureRequest({ ...request(), price: 9900, recipient: "attacker@example.com", city: "Forged" });
  const mail = formatInfrastructureRequest(validated);

  assert.match(mail.subject, /Санкт-Петербурге/);
  assert.match(mail.text, /Перенос из облаков и ЦОДов/);
  assert.match(mail.text, /Сервер для ИИ/);
  assert.match(mail.text, /Копии и восстановление/);
  assert.doesNotMatch(mail.text, /9 900|9900|49 900|Год поддержки|attacker|Forged/);
  assert.deepEqual(Object.keys(validated), ["name", "phone", "message", "serviceIds"]);
});

test("infrastructure validation rejects other catalogs and malformed requests", () => {
  for (const change of [
    { serviceIds: ["knowledge"] }, { serviceIds: ["mail"] }, { serviceIds: ["ai-server", "ai-server"] },
    { serviceIds: "ai-server" }, { serviceIds: [null] }, { serviceIds: Array(10).fill("ai-server") },
    { kind: "ai" }, { phone: "123" }, { name: "A\nB" }, { message: "x".repeat(3001) },
  ]) assert.throws(() => validateInfrastructureRequest({ ...request(), ...change }));

  for (const value of [null, [], 1, "request"]) assert.throws(() => validateInfrastructureRequest(value));
});

test("infrastructure consultation accepts an empty service selection and optional task", () => {
  const mail = formatInfrastructureRequest(validateInfrastructureRequest({ ...request(), serviceIds: [], message: undefined }));

  assert.match(mail.text, /Нужна помощь с подбором решения/);
  assert.match(mail.text, /Не указана/);
});
