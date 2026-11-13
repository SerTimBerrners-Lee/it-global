import { aiServices } from "./catalog.js";
import { serviceCard as originalCard } from "../catalog.js";

/** @type {Record<string, {limitation: string}>} */
const details = {
  audit: { limitation: "Для оценки нужны примеры задач, доступные данные и участие владельца процесса." },
  knowledge: { limitation: "Качество зависит от актуальности документов. При недостатке источников помощник должен сообщать об этом." },
  documents: { limitation: "Проверяем сканы, таблицы и форматы на ваших примерах. Итоговые документы утверждает специалист." },
  agents: { limitation: "Согласуем доступные действия и интеграции. Отправка и изменение записей требуют подтверждения." },
  private: { limitation: "Оборудование, лицензии и расходы зависят от модели, нагрузки и размещения." },
  tuning: { limitation: "Дообучение предлагаем, когда проверки показывают его пользу. Для актуальных знаний сначала оцениваем подключение документов." },
  quality: { limitation: "Критерии и тестовый набор согласуем заранее. Проверка не означает отсутствие ошибок во всех ситуациях." },
  training: { limitation: "Программу согласуем под роли сотрудников. Практика проходит на разрешённых рабочих примерах." },
  support: { limitation: "Режим поддержки, сроки реакции и объём изменений согласуем отдельно." },
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
  logo: service.id + ".svg",
  url: "#services",
  license: "Условия согласуются после оценки задачи",
}));

/** @param {import('../services.js').Service} service @param {boolean} selected @param {boolean} [tile] @returns {string} */
export function serviceCard(service, selected, tile = false) {
  return originalCard(service, selected, tile)
    .replaceAll("./assets/logos/" + service.logo, "/assets/ai-icons/" + service.id + ".svg")
    .replace("Возможная замена:", "Результат:");
}
