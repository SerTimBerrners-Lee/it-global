import { infrastructureServices } from "../dist/servers/catalog.js";
import { RequestError, validateContact } from "./request.js";

/** @typedef {{name: string, phone: string, message: string, serviceIds: string[]}} InfrastructureRequest */

/** @param {unknown} value @returns {InfrastructureRequest} */
export function validateInfrastructureRequest(value) {
  const contact = validateContact(value);

  if (value === null || typeof value !== "object" || !("kind" in value) || value.kind !== "infrastructure") {
    throw new RequestError("Проверьте тип заявки.");
  }

  const serviceIds = "serviceIds" in value ? value.serviceIds : null;
  const knownIds = new Set(infrastructureServices.map((service) => service.id));

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

  return { ...contact, serviceIds: [...selected] };
}

/** @param {InfrastructureRequest} request @returns {import('./mail.js').MailMessage} */
export function formatInfrastructureRequest(request) {
  const chosen = infrastructureServices.filter((service) => request.serviceIds.includes(service.id));
  const text = [
    "Заявка на серверы и перенос инфраструктуры. Санкт-Петербург.",
    "",
    `Имя: ${request.name}`,
    `Телефон: ${request.phone}`,
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

  return { subject: "Заявка на серверы в Санкт-Петербурге с its-global.ru/servers/", text };
}
