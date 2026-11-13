import { getInfrastructureServices } from "../dist/servers/catalog.js";
import { RequestError, validateContact, contactLine } from "./request.js";
import { evaluateConfiguration, configurationChoices } from "../dist/hardware/configuration.js";

/** @typedef {{name: string, contact: string, contactType: 'phone' | 'email', message: string, serviceIds: string[], kind: 'infrastructure' | 'hardware', configuration: import('../dist/hardware/configuration.js').HardwareConfiguration | null}} InfrastructureRequest */

/** @param {unknown} value @returns {InfrastructureRequest} */
export function validateInfrastructureRequest(value) {
  const contact = validateContact(value);

  if (value === null || typeof value !== "object" || !("kind" in value) || (value.kind !== "infrastructure" && value.kind !== "hardware")) {
    throw new RequestError("Проверьте тип заявки.");
  }

  const serviceIds = "serviceIds" in value ? value.serviceIds : null;
  const knownIds = new Set(getInfrastructureServices(value.kind).map((service) => service.id));

  if (!Array.isArray(serviceIds) || serviceIds.length > knownIds.size) {
    throw new RequestError("Проверьте список услуг.");
  }

  const selected = new Set();

  for (const id of serviceIds) {
    if (typeof id !== "string" || !knownIds.has(id) || selected.has(id)) {
      throw new RequestError("В заявке указана неизвестная или повторяющаяся услуга.");
    }

    selected.add(id);
  }

  let configuration = null;

  if ("configuration" in value && value.configuration !== null && value.configuration !== undefined) {
    if (value.kind !== "hardware") throw new RequestError("Конфигурация оборудования относится к заявке на подбор сервера.");

    const result = evaluateConfiguration(value.configuration);

    if (!result.ok) throw new RequestError(result.error);

    configuration = result.configuration;
  }

  return { ...contact, serviceIds: [...selected], kind: value.kind, configuration };
}

/** @param {InfrastructureRequest} request @returns {import('./mail.js').MailMessage} */
export function formatInfrastructureRequest(request) {
  const chosen = getInfrastructureServices(request.kind).filter((service) => request.serviceIds.includes(service.id));
  const isHardware = request.kind === "hardware";
  let text = [
    isHardware ? "Заявка на подбор физического сервера. Санкт-Петербург." : "Заявка на развёртывание и перенос сервисов. Санкт-Петербург.",
    "",
    `Имя: ${request.name}`,
    contactLine(request),
    "",
    "Выбранные услуги:",
    ...chosen.map((service) => `- ${service.title}`),
    ...(chosen.length ? [] : ["Нужна помощь с подбором решения."]),
    "",
    "Задача компании:",
    request.message || "Не указана.",
    "",
    "Состав работ, оборудование, сроки, выезд и сопровождение согласуются после оценки.",
  ].join("\n");

  const result = request.configuration ? evaluateConfiguration(request.configuration) : null;

  if (result?.ok) {
    const c = result.configuration;

    text += "\n\nПредварительные требования посетителя к физическому серверу:\n" + [
      "Назначение: " + configurationChoices.purpose[c.purpose],
      "Пользователей одновременно: " + c.users,
      "Процессор: " + c.cores + " ядер",
      "ОЗУ: " + c.ram + " ГБ",
      "Диски: " + c.diskCount + " × " + c.diskSize + " ТБ, " + configurationChoices.diskType[c.diskType],
      "Массив: " + configurationChoices.raid[c.raid],
      "Номинальный полезный объём: " + result.usableTb + " ТБ до форматирования и служебных резервов",
      "Видеокарта: " + configurationChoices.gpu[c.gpu],
      "Корпус: " + configurationChoices.chassis[c.chassis],
      "Бюджет на оборудование: " + (c.budget === null ? "Не указан" : c.budget.toLocaleString("ru-RU") + " ₽"),
      "Совместимость и достаточность ресурсов требуют инженерной проверки. Это не готовая спецификация или предложение цены.",
    ].join("\n");
  }

  return { subject: isHardware
    ? "Заявка на физический сервер в Санкт-Петербурге с its-global.ru/hardware/"
    : "Заявка на развёртывание сервисов в Санкт-Петербурге с its-global.ru/servers/", text };
}
