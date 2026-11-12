import { aiServices, deployments } from "../dist/ai/catalog.js";
import { RequestError, validateContact, contactLine } from "./request.js";

/**
 * @typedef {{name: string, contact: string, contactType: 'phone' | 'email', message: string, company: string, serviceIds: string[], deployment: string}} AiRequest
 */

/** @param {unknown} value @returns {AiRequest} */
export function validateAiRequest(value) {
  const contact = validateContact(value);

  if (value === null || typeof value !== "object" || !("kind" in value) || value.kind !== "ai") {
    throw new RequestError("Проверьте тип заявки.");
  }

  const company = "company" in value ? value.company : "";
  const serviceIds = "serviceIds" in value ? value.serviceIds : null;
  const deployment = "deployment" in value ? value.deployment : null;

  if (typeof company !== "string" || company.length > 160 || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(company)) {
    throw new RequestError("Укажите компанию: не более 160 символов без переноса строки.");
  }

  if (!Array.isArray(serviceIds) || serviceIds.length > aiServices.length) {
    throw new RequestError("Проверьте список услуг.");
  }

  const ids = new Set(aiServices.map((service) => service.id));
  const validatedIds = [];

  for (const id of serviceIds) {
    if (typeof id !== "string" || !ids.has(id) || validatedIds.includes(id)) {
      throw new RequestError("В заявке указана неизвестная или повторяющаяся услуга.");
    }

    validatedIds.push(id);
  }

  if (typeof deployment !== "string" || !Object.hasOwn(deployments, deployment)) {
    throw new RequestError("Выберите вариант размещения системы.");
  }

  return { ...contact, company: company.trim(), serviceIds: validatedIds, deployment };
}

/** @param {AiRequest} request @returns {import('./mail.js').MailMessage} */
export function formatAiRequest(request) {
  const chosen = aiServices.filter((service) => request.serviceIds.includes(service.id));
  const text = [
    "Заявка на внедрение LLM. IT Global AI",
    "",
    `Имя: ${request.name}`,
    contactLine(request),
    `Компания: ${request.company || "Не указана"}`,
    `Размещение: ${deployments[request.deployment]}`,
    "",
    "Выбранные услуги:",
    ...chosen.map((service) => `- ${service.title}`),
    ...(chosen.length ? [] : ["Нужна помощь с подбором услуг."]),
    "",
    "Задача компании:",
    request.message || "Не указана.",
    "",
    "Стоимость, сроки, инфраструктура и сопровождение согласуются после оценки задачи.",
    "Тарифы установки корпоративных сервисов к этой заявке не применяются.",
  ].join("\n");

  return { subject: "Заявка на внедрение LLM с its-global.ru/ai/", text };
}
