import { calculateCosts } from "../dist/calculator.js";
import { services } from "../dist/services.js";

/**
 * @typedef {Object} RequestData
 * @property {string} name
 * @property {string} phone
 * @property {string} message
 * @property {string[]} serviceIds
 * @property {{current: number, plan: 'single' | 'bundle', needsVds: boolean}} calculation
 */

export class RequestError extends Error {
  /** @param {string} message @param {number} [status] @returns {RequestError} */
  constructor(message, status = 400) {
    super(message);
    this.name = "RequestError";
    this.status = status;
  }
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  if (value === null || typeof value !== "object") return false;

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

/** @param {unknown} value @returns {RequestData} */
export function validateRequest(value) {
  if (!isRecord(value)) {
    throw new RequestError("Не удалось прочитать заявку. Попробуйте ещё раз.");
  }

  if (
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.trim().length > 100 ||
    /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value.name)
  ) {
    throw new RequestError("Укажите имя длиной от 1 до 100 символов без переноса строки.");
  }

  if (typeof value.phone !== "string") {
    throw new RequestError("Укажите номер телефона.");
  }

  const phone = value.phone.trim();
  const phoneDigits = phone.replace(/\D/g, "");

  if (
    phone.length > 30 ||
    !/^\+?[0-9 ()-]+$/.test(phone) ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(value.phone) ||
    phoneDigits.length < 7 ||
    phoneDigits.length > 15
  ) {
    throw new RequestError("Введите номер телефона от 7 до 15 цифр. Допустимы пробелы, скобки, дефисы и плюс в начале.");
  }

  const message = value.message === undefined ? "" : value.message;

  if (typeof message !== "string" || message.length > 3000 || message.includes("\0")) {
    throw new RequestError("Описание задачи должно содержать не больше 3000 символов.");
  }

  if (!Array.isArray(value.serviceIds) || value.serviceIds.length > services.length) {
    throw new RequestError("Проверьте список выбранных сервисов.");
  }

  const validIds = new Set(services.map((service) => service.id));
  const serviceIds = [];

  for (const id of value.serviceIds) {
    if (typeof id !== "string" || !validIds.has(id) || serviceIds.includes(id)) {
      throw new RequestError("В заявке указан неизвестный или повторяющийся сервис.");
    }

    serviceIds.push(id);
  }

  const calculation = value.calculation;

  if (
    !isRecord(calculation) ||
    typeof calculation.current !== "number" ||
    !Number.isFinite(calculation.current) ||
    calculation.current < 1000 ||
    calculation.current > 1000000 ||
    (calculation.plan !== "single" && calculation.plan !== "bundle") ||
    typeof calculation.needsVds !== "boolean"
  ) {
    throw new RequestError("Проверьте предварительный расчёт: расходы от 1 000 до 1 000 000 ₽, формат внедрения и наличие сервера.");
  }

  return {
    name: value.name.trim(),
    phone,
    message: message.trim(),
    serviceIds,
    calculation: {
      current: calculation.current,
      plan: calculation.plan,
      needsVds: calculation.needsVds,
    },
  };
}

/** @param {number} value @returns {string} */
function money(value) {
  return Math.round(value).toLocaleString("ru-RU").replace(/[\u00a0\u202f]/g, " ") + " ₽";
}

/** @param {RequestData} request @returns {{subject: string, text: string}} */
export function formatRequest(request) {
  const chosen = services.filter((service) => request.serviceIds.includes(service.id));
  const plan = chosen.length === 1
    ? "Быстрая замена, один сервис"
    : chosen.length > 1
      ? "Всё для команды, любое количество сервисов"
      : "Индивидуальный подбор";
  const selectedPrice = chosen.length === 0
    ? "Стоимость внедрения: после подбора сервисов."
    : "Внедрение по выбранным сервисам: " + money(chosen.length === 1 ? 9900 : 49900) + " разово.";
  const calculation = calculateCosts(request.calculation);

  const text = [
    "Заявка на внедрение корпоративных сервисов. IT Global",
    "",
    "Имя: " + request.name,
    "Телефон: " + request.phone,
    "",
    "Формат по выбранным сервисам: " + plan,
    selectedPrice,
    "Поддержка: 12 месяцев с запуска каждого установленного сервиса.",
    "",
    "Нужные сервисы:",
    ...chosen.map((service) => "- " + service.title + " (" + service.product + ")"),
    ...(chosen.length === 0 ? ["Нужна помощь с подбором сервисов."] : []),
    "",
    "Текущие сервисы и задача:",
    request.message || "Не указаны.",
    "",
    "Предварительный расчёт (допущения посетителя, не коммерческое предложение):",
    "Сценарий калькулятора задаётся отдельно от набора выбранных сервисов.",
    "Формат расчёта: " + (calculation.plan === "single" ? "Один сервис" : "Весь набор"),
    "Сервер: " + (calculation.needsVds ? "VDS с резервными копиями" : "Свой сервер"),
    "Подписки сейчас: " + money(calculation.before) + "/мес.",
    "После перехода: " + money(calculation.after) + "/мес.",
    "Разовое внедрение в расчёте: " + money(calculation.setup),
    "Первый год после: " + money(calculation.firstYear),
    calculation.firstYearExtraCost > 0
      ? "Дополнительные расходы за первый год: " + money(calculation.firstYearExtraCost)
      : "Экономия за первый год: " + money(calculation.firstYearSavings),
    "",
    "Нужно проверить функции, интеграции, нагрузку, ограничения лицензий и объём миграции.",
    ...(request.serviceIds.includes("local-ai")
      ? ["Для локального ИИ отдельно рассчитываются ресурсы: память, видеокарта и аренда. Типовой VDS в калькуляторе может не подойти выбранной модели."]
      : []),
  ].join("\n");

  return { subject: "Новая заявка с its-global.ru", text };
}
