import { calculateCosts } from "./calculator.js";

/** @param {number} value @returns {string} */
function money(value) {
  return Math.round(value).toLocaleString("ru-RU") + " ₽";
}

/** @param {string} selector @returns {HTMLElement} */
function element(selector) {
  const target = document.querySelector(selector);

  if (!(target instanceof HTMLElement)) {
    throw new Error("Не найден элемент калькулятора: " + selector);
  }

  return target;
}

/** @param {string} selector @returns {HTMLInputElement} */
function input(selector) {
  const target = element(selector);

  if (!(target instanceof HTMLInputElement)) {
    throw new Error("Не найдено поле калькулятора: " + selector);
  }

  return target;
}

/** @returns {{ getCalculation: () => import('./calculator.js').CostCalculation }} */
export function initializeCalculator() {
  const current = input("#current-cost");
  const range = input("#current-range");
  const single = input("#calculator-single");
  const bundle = input("#calculator-bundle");
  const vds = input("#calculator-vds");
  let calculation = calculateCosts({ current: current.value, plan: "bundle", needsVds: vds.checked });

  /** @returns {void} */
  function update() {
    calculation = calculateCosts({
      current: current.value,
      plan: single.checked ? "single" : "bundle",
      needsVds: vds.checked,
    });

    const c = calculation;

    range.value = String(c.before);
    element("#annual-savings").textContent = money(c.firstYearSavings);
    element("#annual-before").textContent = money(c.annualBefore);
    element("#setup-display").textContent = money(c.setup);
    element("#annual-server").textContent = money(c.annualServer);
    element("#first-year").textContent = money(c.firstYear);
    element("#first-year-extra").textContent = money(c.firstYearExtraCost);
    element("#extra-cost-row").hidden = c.firstYearExtraCost === 0;
    element("#payback").textContent = c.payback === null
      ? "Не окупается"
      : (Math.ceil(c.payback * 10) / 10).toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + " мес.";
    element("#result-factor").textContent = c.firstYearBalance > 0
      ? "Меньше расходов уже в первый год"
      : c.firstYearBalance === 0
        ? "Первый год без переплаты"
        : c.monthlySavings > 0
          ? "В первый год переход не окупится"
          : "При этих расходах переход невыгоден";
    element("#calculator-results").dataset.unprofitable = String(c.firstYearExtraCost > 0);
    element("#calculator-note").textContent = c.needsVds
      ? "В расчёте VDS с резервными копиями за 3 000 ₽ в месяц и год поддержки каждого сервиса. Ресурсы сервера подберём под нагрузку."
      : "В расчёте используется ваш сервер без дополнительных расходов на аренду. Год поддержки каждого сервиса включён во внедрение.";
  }

  current.addEventListener("input", update);
  current.addEventListener("change", () => {
    current.value = String(calculation.before);
    update();
  });
  range.addEventListener("input", () => {
    current.value = range.value;
    update();
  });
  [single, bundle, vds].forEach((control) => control.addEventListener("change", update));
  element("#reset-calc").addEventListener("click", () => {
    current.value = "10000";
    bundle.checked = true;
    vds.checked = false;
    update();
  });

  update();

  /** @returns {import('./calculator.js').CostCalculation} */
  function getCalculation() {
    return calculation;
  }

  return { getCalculation };
}
