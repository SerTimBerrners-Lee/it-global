import assert from "node:assert/strict";
import test from "node:test";
import { services } from "../dist/services.js";
import { RequestError, formatRequest, validateRequest } from "../server/request.js";

/** @returns {import('../server/request.js').RequestData} */
function request() {
  return {
    name: "Анна",
    phone: "+7 (999) 123-45-67",
    message: "Перенести почту\nи общие документы.",
    serviceIds: ["mail"],
    calculation: { current: 10000, plan: "single", needsVds: false },
  };
}

/** @param {unknown} value @returns {void} */
function rejects(value) {
  assert.throws(() => validateRequest(value), { name: "RequestError", status: 400 });
}

test("validates and copies the supported fields without mutating the input", () => {
  const original = request();
  original.name = "  Анна Петрова  ";
  original.phone = "  +7 (999) 123-45-67  ";
  original.message = "  Перенести почту\nи общие документы.  ";
  const result = validateRequest(original);

  assert.deepEqual(result, {
    ...request(),
    name: "Анна Петрова",
  });
  assert.notEqual(result.serviceIds, original.serviceIds);
  assert.notEqual(result.calculation, original.calculation);
  assert.equal(original.name, "  Анна Петрова  ");
  assert.equal(validateRequest({ ...request(), message: undefined }).message, "");
  assert.ok(new RequestError("Ошибка") instanceof Error);
});

test("rejects non-record bodies and blank, oversized or control-containing names", () => {
  for (const value of [null, [], "request", 1, true, new Date(), Object.create({ name: "Анна" })]) {
    rejects(value);
  }

  for (const name of [undefined, null, 5, " ", "а".repeat(101), "Анна\r\nBcc: a@example.com", "Анна\0", "Анна\u0085", "Анна\u2028Петрова"]) {
    rejects({ ...request(), name });
  }

  assert.equal(validateRequest({ ...request(), name: "а".repeat(100) }).name.length, 100);
});

test("accepts common phone formatting and enforces digit and format limits", () => {
  for (const phone of ["1234567", "+123456789012345", "8 (999) 123-45-67"]) {
    assert.equal(validateRequest({ ...request(), phone }).phone, phone);
  }

  for (const phone of [undefined, null, 79991234567, "123456", "1234567890123456", "+7 letters 9991234567", "7+9991234567", "79991234567\n", "(".repeat(20) + "79991234567"]) {
    rejects({ ...request(), phone });
  }
});

test("preserves multiline task text but rejects nulls, non-strings and oversized tasks", () => {
  assert.equal(validateRequest({ ...request(), message: "а".repeat(3000) }).message.length, 3000);
  assert.equal(validateRequest(request()).message, "Перенести почту\nи общие документы.");

  for (const message of [null, 12, {}, "а".repeat(3001), "Перенести\0почту"]) {
    rejects({ ...request(), message });
  }
});

test("allows only known unique service IDs with an optional empty selection", () => {
  assert.deepEqual(validateRequest({ ...request(), serviceIds: [] }).serviceIds, []);
  assert.equal(validateRequest({ ...request(), serviceIds: services.map((service) => service.id) }).serviceIds.length, services.length);

  for (const serviceIds of [undefined, null, "mail", ["unknown"], [1], ["mail", "mail"], Array(services.length + 1).fill("mail")]) {
    rejects({ ...request(), serviceIds });
  }
});

test("requires finite numeric calculator inputs and explicit supported options", () => {
  for (const current of [undefined, null, "10000", NaN, Infinity, -Infinity, 999, 1000001]) {
    rejects({ ...request(), calculation: { ...request().calculation, current } });
  }

  for (const calculation of [undefined, null, [], { current: 10000, plan: "other", needsVds: false }, { current: 10000, plan: "single", needsVds: "false" }]) {
    rejects({ ...request(), calculation });
  }

  for (const current of [1000, 1000000]) {
    assert.equal(validateRequest({ ...request(), calculation: { ...request().calculation, current } }).calculation.current, current);
  }
});

test("ignores tampered recipients, content and totals and calculates all four scenarios", () => {
  const scenarios = [
    { plan: "single", needsVds: false, savings: "110 100 ₽", setup: "9 900 ₽" },
    { plan: "single", needsVds: true, savings: "74 100 ₽", setup: "9 900 ₽" },
    { plan: "bundle", needsVds: false, savings: "70 100 ₽", setup: "49 900 ₽" },
    { plan: "bundle", needsVds: true, savings: "34 100 ₽", setup: "49 900 ₽" },
  ];

  for (const scenario of scenarios) {
    const validated = validateRequest({
      ...request(),
      recipient: "attacker@example.com",
      subject: "Forged subject",
      text: "Forged content",
      calculation: { current: 10000, ...scenario, setup: 1, firstYearSavings: 99999999 },
    });
    const mail = formatRequest(validated);

    assert.equal(mail.subject, "Новая заявка с its-global.ru");
    assert.ok(mail.text.includes("Экономия за первый год: " + scenario.savings));
    assert.ok(mail.text.includes("Разовое внедрение в расчёте: " + scenario.setup));
    assert.doesNotMatch(mail.text, /attacker|Forged|99999999/);
    assert.deepEqual(Object.keys(validated), ["name", "phone", "message", "serviceIds", "calculation"]);
    assert.deepEqual(Object.keys(validated.calculation), ["current", "plan", "needsVds"]);
  }
});

test("keeps the selected service tariff separate from a different calculator scenario", () => {
  const value = request();
  value.calculation.plan = "bundle";
  const { text } = formatRequest(validateRequest(value));

  assert.match(text, /Формат по выбранным сервисам: Быстрая замена, один сервис/);
  assert.match(text, /Внедрение по выбранным сервисам: 9 900 ₽ разово/);
  assert.match(text, /Корпоративная почта \(Mailu\)/);
  assert.match(text, /Сценарий калькулятора задаётся отдельно от набора выбранных сервисов/);
  assert.match(text, /Формат расчёта: Весь набор/);
  assert.match(text, /Разовое внедрение в расчёте: 49 900 ₽/);
  assert.match(text, /12 месяцев с запуска каждого установленного сервиса/);
  assert.doesNotMatch(text, /\u2014/);
});

test("covers individual selection, the bundle price and the AI resource qualification", () => {
  const individual = formatRequest(validateRequest({ ...request(), serviceIds: [], message: "" })).text;
  const aiBundle = formatRequest(validateRequest({ ...request(), serviceIds: ["mail", "local-ai"] })).text;

  assert.match(individual, /Индивидуальный подбор/);
  assert.match(individual, /Стоимость внедрения: после подбора сервисов/);
  assert.match(individual, /Нужна помощь с подбором сервисов/);
  assert.match(individual, /Текущие сервисы и задача:\nНе указаны/);
  assert.doesNotMatch(individual, /Для локального ИИ отдельно/);
  assert.match(aiBundle, /Всё для команды, любое количество сервисов/);
  assert.match(aiBundle, /Внедрение по выбранным сервисам: 49 900 ₽ разово/);
  assert.match(aiBundle, /Для локального ИИ отдельно рассчитываются ресурсы: память, видеокарта и аренда/);
  assert.match(aiBundle, /Типовой VDS в калькуляторе может не подойти выбранной модели/);
});

test("reports extra costs without claiming negative savings for an unprofitable request", () => {
  const value = request();
  value.calculation = { current: 1000, plan: "bundle", needsVds: true };
  const { text } = formatRequest(validateRequest(value));

  assert.match(text, /Первый год после: 85 900 ₽/);
  assert.match(text, /Дополнительные расходы за первый год: 73 900 ₽/);
  assert.doesNotMatch(text, /Экономия за первый год:/);
});
