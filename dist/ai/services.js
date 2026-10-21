import { aiServices } from "./catalog.js";
import { serviceCard as originalCard } from "../catalog.js";

/** @type {Record<string, {logo: string, limitation: string}>} */
const details = {
  audit: { logo: "matomo.svg", limitation: "Для оценки нужны примеры задач, доступные данные и участие владельца процесса." },
  knowledge: { logo: "bookstack.svg", limitation: "Качество зависит от актуальности документов. При недостатке источников помощник должен сообщать об этом." },
  documents: { logo: "onlyoffice.svg", limitation: "Проверяем сканы, таблицы и форматы на ваших примерах. Итоговые документы утверждает специалист." },
  agents: { logo: "automation.png", limitation: "Согласуем доступные действия и интеграции. Отправка и изменение записей требуют подтверждения." },
  private: { logo: "ollama.svg", limitation: "Оборудование, лицензии и расходы зависят от модели, нагрузки и размещения." },
  tuning: { logo: "ollama.svg", limitation: "Дообучение предлагаем, когда проверки показывают его пользу. Для актуальных знаний сначала оцениваем подключение документов." },
  quality: { logo: "vaultwarden.svg", limitation: "Критерии и тестовый набор согласуем заранее. Проверка не означает отсутствие ошибок во всех ситуациях." },
  training: { logo: "jitsi.svg", limitation: "Программу согласуем под роли сотрудников. Практика проходит на разрешённых рабочих примерах." },
  support: { logo: "openproject.svg", limitation: "Режим поддержки, сроки реакции и объём изменений согласуем отдельно." },
};

/** @type {Record<string, import('../services.js').Service['category']>} */
const categories = { start: "work", implementation: "work", adaptation: "business", team: "communication" };

/** @type {import('../services.js').Service[]} */
export const services = aiServices.map((service) => ({
  id: service.id,
  title: service.title,
  product: service.title,
  category: categories[service.category],
  description: service.description,
  replaces: [service.result],
  detail: service.description,
  limitation: details[service.id].limitation,
  logo: details[service.id].logo,
  url: "#services",
  license: "Условия согласуются после оценки задачи",
}));

/** @param {import('../services.js').Service} service @param {boolean} selected @param {boolean} [tile] @returns {string} */
export function serviceCard(service, selected, tile = false) {
  return originalCard(service, selected, tile)
    .replaceAll("./assets/", "/assets/")
    .replace("Возможная замена:", "Результат:");
}
