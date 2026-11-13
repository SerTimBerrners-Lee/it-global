import { calculateCosts } from "../dist/calculator.js";
import { services } from "../dist/services.js";
import { parseContact } from "../dist/contact.js";

/**
 * @typedef {Object} RequestData
 * @property {string} name
 * @property {string} contact
 * @property {'phone' | 'email'} contactType
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

/** @param {unknown} value @returns {{name: string, contact: string, contactType: 'phone' | 'email', message: string}} */
export function validateContact(value) {
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

  const contact = parseContact(Object.hasOwn(value, "contact") ? value.contact : value.phone);

  if (!contact) throw new RequestError("Укажите телефон от 7 до 15 цифр или email, например name@company.ru.");

  const message = value.message === undefined ? "" : value.message;

  if (typeof message !== "string" || message.length > 3000 || message.includes("\0")) {
    throw new RequestError("Описание задачи должно содержать не больше 3000 символов.");
  }

  return { name: value.name.trim(), contact: contact.value, contactType: contact.type, message: message.trim() };
}

/** @param {{contact: string, contactType: 'phone' | 'email'}} request @returns {string} */
export function contactLine(request) {
  return (request.contactType === "email" ? "Email: " : "Телефон: ") + request.contact;
}

/** @param {unknown} value @returns {RequestData} */
export function validateRequest(value) {
  const contact = validateContact(value);

  if (!isRecord(value)) throw new RequestError("Не удалось прочитать заявку.");

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
    ...contact,
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
    contactLine(request),
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
