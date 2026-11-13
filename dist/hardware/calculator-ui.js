import { evaluateConfiguration, configurationChoices } from "./configuration.js";

/** @param {string} selector @returns {HTMLElement} */
function element(selector) {
  const target = document.querySelector(selector);

  if (!(target instanceof HTMLElement)) throw new Error("Не найден элемент конфигуратора: " + selector);

  return target;
}

/** @returns {{getConfiguration: () => import('./configuration.js').HardwareConfiguration | null, validate: () => boolean}} */
export function initializeHardwareConfigurator() {
  const form = element("#hardware-configuration");
  let result = evaluateConfiguration(null);

  /** @returns {void} */
  function update() {
    if (!(form instanceof HTMLFormElement)) return;

    const fields = new FormData(form);
    /** @type {Record<string, unknown>} */
    const value = Object.fromEntries(fields);

    for (const field of ["users", "cores", "ram", "diskCount", "diskSize"]) value[field] = value[field] === "" ? NaN : Number(value[field]);

    value.budget = value.budget === "" ? null : Number(value.budget);
    result = evaluateConfiguration(value);
    element("#configuration-error").textContent = result.ok ? "" : result.error;
    element("#configuration-submit").setAttribute("aria-disabled", String(!result.ok));

    if (!result.ok) {
      element("#configuration-summary").textContent = "Проверьте параметры";

      for (const id of ["cpu", "ram", "storage", "raw", "gpu", "chassis"]) element("#configuration-" + id).textContent = "Нет расчёта";

      return;
    }

    const c = result.configuration;

    element("#configuration-summary").textContent = c.ram + " ГБ ОЗУ";
    element("#configuration-cpu").textContent = c.cores + " ядер";
    element("#configuration-ram").textContent = c.ram + " ГБ";
    element("#configuration-storage").textContent = result.usableTb.toLocaleString("ru-RU") + " ТБ";
    element("#configuration-raw").textContent = c.diskCount + " × " + c.diskSize.toLocaleString("ru-RU") + " ТБ";
    element("#configuration-gpu").textContent = configurationChoices.gpu[c.gpu];
    element("#configuration-chassis").textContent = configurationChoices.chassis[c.chassis];
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", (event) => event.preventDefault());
  update();

  /** @returns {import('./configuration.js').HardwareConfiguration | null} */
  function getConfiguration() {
    update();

    return result.ok ? result.configuration : null;
  }

  /** @returns {boolean} */
  function validate() {
    update();

    if (!(form instanceof HTMLFormElement)) return false;

    const valid = form.reportValidity() && result.ok;

    if (!valid) element("#configuration-error").focus();

    return valid;
  }

  return { getConfiguration, validate };
}
