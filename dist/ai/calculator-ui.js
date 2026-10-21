import { calculateEffect } from "./effect.js";

/** @param {string} selector @returns {HTMLElement} */
function element(selector) {
  const target = document.querySelector(selector);

  if (!(target instanceof HTMLElement)) throw new Error("Не найден элемент: " + selector);

  return target;
}

/** @param {string} selector @returns {HTMLInputElement} */
function input(selector) {
  const target = element(selector);

  if (!(target instanceof HTMLInputElement)) throw new Error("Не найдено поле: " + selector);

  return target;
}

/** @param {number} value @returns {string} */
function money(value) {
  return Math.round(value).toLocaleString("ru-RU") + " ₽";
}

/** @returns {void} */
export function initializeCalculator() {
  const volume = input("#calc-volume");
  const before = input("#calc-before");
  const after = input("#calc-after");
  const hourly = input("#calc-hourly");
  const operating = input("#calc-operating");
  const investment = input("#calc-investment");
  const fields = [volume, before, after, hourly, operating, investment];

  /** @returns {void} */
  function update() {
    const result = calculateEffect({
      volume: volume.valueAsNumber,
      before: before.valueAsNumber,
      after: after.valueAsNumber,
      hourly: hourly.valueAsNumber,
      operating: operating.valueAsNumber,
      investment: investment.valueAsNumber,
    });

    element("#effect-error").textContent = result ? "" : "Заполните все поля допустимыми неотрицательными значениями. Количество задач должно быть целым и больше нуля.";
    element("#calculator-results").dataset.unprofitable = String(!result || result.net <= 0);

    if (!result) {
      for (const id of ["net", "hours", "capacity", "operating", "investment", "payback"]) element("#effect-" + id).textContent = "Нет расчёта";

      element("#result-factor").textContent = "Проверьте исходные данные";

      return;
    }

    element("#effect-net").textContent = money(result.net);
    element("#effect-hours").textContent = result.hours.toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + " ч/мес.";
    element("#effect-capacity").textContent = money(result.capacityValue);
    element("#effect-operating").textContent = money(operating.valueAsNumber);
    element("#effect-investment").textContent = money(investment.valueAsNumber);
    element("#effect-payback").textContent = result.payback === null ? "Не достигается" : result.payback.toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + " мес.";
    element("#result-factor").textContent = result.net > 0 ? "При введённых условиях" : "Положительного эффекта нет";
  }

  fields.forEach((field) => field.addEventListener("input", update));
  element("#reset-calc").addEventListener("click", () => {
    fields.forEach((field) => { field.value = field.defaultValue; });
    update();
  });

  update();
}
