import { aiServices } from "./catalog.js";
import { calculateEffect } from "./effect.js";
import { trackGoal } from "../analytics.js";

/** @param {string} selector @returns {HTMLElement} */
function element(selector) {
  const found = document.querySelector(selector);

  if (!(found instanceof HTMLElement)) throw new Error(`Missing element: ${selector}`);

  return found;
}

/** @param {string} selector @returns {HTMLInputElement} */
function input(selector) {
  const found = document.querySelector(selector);

  if (!(found instanceof HTMLInputElement)) throw new Error(`Missing input: ${selector}`);

  return found;
}

const storageKey = "it-global-ai-services";
const allowed = new Set(aiServices.map((service) => service.id));
const selected = new Set();
let sending = false;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");

  if (Array.isArray(saved)) {
    for (const id of saved) {
      if (allowed.has(id)) selected.add(id);
    }
  }
} catch {
  // Selection remains available without persistent storage.
}

/** @returns {void} */
function renderSelection() {
  for (const button of document.querySelectorAll("[data-select]")) {
    const active = selected.has(button.getAttribute("data-select"));

    button.setAttribute("aria-pressed", String(active));
    button.textContent = active ? "✓ В заявке" : "+ Включить в заявку";
  }

  for (const card of document.querySelectorAll("[data-service]")) {
    card.classList.toggle("selected", selected.has(card.getAttribute("data-service")));
  }

  element("#selection-summary").textContent = selected.size
    ? aiServices.filter((service) => selected.has(service.id)).map((service) => service.title).join(" · ")
    : "Поможем подобрать услуги под задачу.";
  element("#clear-selection").hidden = selected.size === 0;
  element("#selection-dock").hidden = selected.size === 0;
  element("#dock-count").textContent = `Выбрано услуг: ${selected.size}`;

  try {
    localStorage.setItem(storageKey, JSON.stringify([...selected]));
  } catch {
    // Contact details are never stored in the browser.
  }
}

for (const button of document.querySelectorAll("[data-select]")) {
  button.addEventListener("click", () => {
    const id = button.getAttribute("data-select");

    if (!allowed.has(id)) return;
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);

    renderSelection();
  });
}

element("#clear-selection").addEventListener("click", () => {
  selected.clear();
  renderSelection();
});

for (const button of document.querySelectorAll("[data-filter]")) {
  button.addEventListener("click", () => {
    const filter = button.getAttribute("data-filter");
    let count = 0;

    for (const control of document.querySelectorAll("[data-filter]")) {
      control.setAttribute("aria-pressed", String(control === button));
    }

    for (const card of document.querySelectorAll("[data-service]")) {
      const visible = filter === "all" || card.getAttribute("data-category") === filter;

      if (card instanceof HTMLElement) card.hidden = !visible;
      if (visible) count += 1;
    }

    element("#service-count").textContent = `Показано услуг: ${count} из ${aiServices.length}`;
  });
}

const menu = element("#mobile-nav");
const menuToggle = element(".menu-toggle");

menuToggle.addEventListener("click", () => {
  menu.hidden = !menu.hidden;
  menuToggle.setAttribute("aria-expanded", String(!menu.hidden));
  menuToggle.setAttribute("aria-label", menu.hidden ? "Открыть меню" : "Закрыть меню");
});

for (const link of menu.querySelectorAll("a")) {
  link.addEventListener("click", () => {
    menu.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Открыть меню");
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !menu.hidden) {
    menu.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Открыть меню");
    menuToggle.focus();
  }
});

const scenarios = {
  knowledge: {
    label: "ПОМОЩНИК ПО БАЗЕ ЗНАНИЙ", title: "Нужная инструкция, когда она нужна",
    description: "Сотрудник задаёт вопрос обычным языком. Помощник находит действующий документ, показывает выдержку и ссылку. Если сведений недостаточно, сообщает об этом.",
    data: "Утверждённые инструкции, паспорта оборудования, регламенты и базу знаний.",
    metric: "Время поиска, правильность ссылок и соблюдение прав доступа.",
    question: "Где найти актуальный регламент передачи смены?", answerTitle: "Нашёл документ в базе знаний",
    answer: "В разделе «Производство / Работа смены» есть утверждённый регламент. Перед передачей смены проверьте незавершённые работы и внесите записи в журнал.",
    source: "↗ Регламент передачи смены · раздел 3", services: ["knowledge"],
  },
  quality: {
    label: "ПОМОЩНИК ОТДЕЛА КАЧЕСТВА", title: "Сверка документов до ручной проверки",
    description: "Помощник сопоставляет паспорт партии со спецификацией и отмечает расхождения. Решение о соответствии принимает специалист по утверждённому порядку.",
    data: "Паспорта партий, спецификации, шаблоны актов и правила сверки.",
    metric: "Точность извлечения полей, пропущенные расхождения и время проверки.",
    question: "Каких сведений не хватает в паспорте партии?", answerTitle: "Нужна проверка специалиста",
    answer: "В примере паспорта не найдено значение одного обязательного параметра. Подготовил перечень полей для сверки с исходным документом. Соответствие партии не подтверждено.",
    source: "↗ Паспорт партии · таблица характеристик", services: ["documents", "quality"],
  },
  procurement: {
    label: "ПОМОЩНИК СНАБЖЕНИЯ", title: "Предложения поставщиков в одном сравнении",
    description: "Из писем и коммерческих предложений собираем таблицу характеристик, сроков и условий. Несопоставимые позиции и отсутствующие данные отмечаем для закупщика.",
    data: "Коммерческие предложения, заявки подразделений и справочник номенклатуры.",
    metric: "Время подготовки сравнения, корректность полей и число исправлений.",
    question: "Сравни предложения по нашей заявке", answerTitle: "Подготовлено сравнение для закупщика",
    answer: "У первого поставщика указаны все запрошенные параметры. У второго отсутствует срок поставки. Рекомендую запросить уточнение до решения. Заказ не отправлен.",
    source: "↗ Предложения поставщиков · условия поставки", services: ["documents", "agents"],
  },
  reports: {
    label: "ПОМОЩНИК РУКОВОДИТЕЛЯ СМЕНЫ", title: "События смены в понятной сводке",
    description: "Из утверждённых записей собираем черновик отчёта с событиями, отклонениями и открытыми вопросами. Числовые показатели берём из учётной системы.",
    data: "Журналы смены, утверждённые выгрузки и доступные отчёты.",
    metric: "Полнота событий, отсутствие выдуманных причин и время подготовки сводки.",
    question: "Что нужно передать следующей смене?", answerTitle: "Черновик сводки на проверку",
    answer: "В журнале остались незавершённые работы и заявка на обслуживание. Добавил их в раздел передачи смены. Причина задержки в источниках не указана.",
    source: "↗ Журнал смены · незавершённые работы", services: ["knowledge", "agents"],
  },
};
let scenarioKey = "knowledge";

for (const button of document.querySelectorAll("[data-scenario]")) {
  button.addEventListener("click", () => {
    const key = button.getAttribute("data-scenario");
    const scenario = scenarios[key];

    if (!scenario) return;

    scenarioKey = key;

    for (const control of document.querySelectorAll("[data-scenario]")) {
      control.setAttribute("aria-pressed", String(control === button));
    }

    for (const field of ["label", "title", "description", "data", "metric"]) {
      element(`#scenario-${field}`).textContent = scenario[field];
    }

    element("#demo-question").textContent = scenario.question;
    element("#demo-title").textContent = scenario.answerTitle;
    element("#demo-answer").textContent = scenario.answer;
    element("#demo-source").textContent = scenario.source;
  });
}

element("#scenario-request").addEventListener("click", () => {
  for (const id of scenarios[scenarioKey].services) selected.add(id);

  const message = document.querySelector('[name="message"]');

  if (message instanceof HTMLTextAreaElement && !message.value.trim()) {
    message.value = `Интересует сценарий: ${scenarios[scenarioKey].title}.`;
  }

  renderSelection();
});

for (const link of document.querySelectorAll("[data-package]")) {
  link.addEventListener("click", () => {
    const services = { audit: ["audit"], pilot: ["audit", "quality", "training"], launch: ["agents", "support"] };

    for (const id of services[link.getAttribute("data-package")] || []) selected.add(id);

    renderSelection();
  });
}

/** @param {number} value @returns {string} */
function number(value) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

/** @returns {void} */
function updateEffect() {
  const result = calculateEffect({
    volume: input("#calc-volume").valueAsNumber,
    before: input("#calc-before").valueAsNumber,
    after: input("#calc-after").valueAsNumber,
    hourly: input("#calc-hourly").valueAsNumber,
    operating: input("#calc-operating").valueAsNumber,
    investment: input("#calc-investment").valueAsNumber,
  });
  const results = element(".ai-calculation-results");

  results.hidden = result === null;
  element("#effect-error").textContent = result === null ? "Заполните все поля допустимыми числами. Количество операций должно быть целым." : "";

  if (!result) return;

  element("#effect-hours").textContent = result.hours >= 0 ? `${number(result.hours)} ч высвобождается` : `${number(-result.hours)} ч дополнительно`;
  element("#effect-net").textContent = result.net >= 0 ? `${number(result.net)} ₽/мес.` : `${number(-result.net)} ₽/мес. дополнительных затрат`;
  element("#effect-payback").textContent = result.payback === null
    ? "При этих допущениях внедрение не окупается."
    : `Условная окупаемость: ${result.payback.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} мес. при полной реализации потенциала.`;
}

for (const field of document.querySelectorAll(".ai-calculation-inputs input")) {
  field.addEventListener("input", updateEffect);
}

const form = document.querySelector("#ai-request-form");
const submit = document.querySelector("#ai-request-submit");
const phone = input('[name="phone"]');
const status = element("#ai-form-status");

if (!(form instanceof HTMLFormElement) || !(submit instanceof HTMLButtonElement)) throw new Error("Missing request form");

phone.addEventListener("input", () => phone.setCustomValidity(""));

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (sending) return;

  const digits = phone.value.replace(/\D/g, "");
  const validPhone = /^\+?[0-9 ()-]+$/.test(phone.value.trim()) && digits.length >= 7 && digits.length <= 15;

  phone.setCustomValidity(validPhone ? "" : "Укажите телефон от 7 до 15 цифр. Допустимы пробелы, скобки, дефисы и плюс в начале.");

  if (!form.reportValidity()) return;

  const fields = new FormData(form);

  sending = true;
  submit.disabled = true;
  submit.textContent = "Отправляем…";
  form.setAttribute("aria-busy", "true");
  status.textContent = "";
  status.removeAttribute("data-state");

  try {
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        kind: "ai",
        name: fields.get("name"),
        phone: fields.get("phone"),
        company: fields.get("company"),
        message: fields.get("message"),
        serviceIds: [...selected],
        deployment: fields.get("deployment"),
      }),
    });
    const result = await response.json();

    if (!response.ok || result.ok !== true) {
      throw new Error(typeof result.error === "string" ? result.error : "Не удалось отправить заявку. Попробуйте позже.");
    }

    status.dataset.state = "success";
    status.textContent = "Заявка отправлена. Свяжемся с вами по указанному телефону.";
    trackGoal("request_sent");
  } catch (error) {
    status.dataset.state = "error";
    status.textContent = error instanceof Error && error.name === "Error"
      ? error.message
      : "Не удалось подтвердить отправку. Позвоните нам: +7 (921) 115-31-43.";
  } finally {
    sending = false;
    submit.disabled = false;
    submit.textContent = "Обсудить задачу";
    form.removeAttribute("aria-busy");
  }
});

renderSelection();
updateEffect();
