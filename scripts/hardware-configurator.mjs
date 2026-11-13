import { coreChoices, ramChoices, diskSizeChoices, configurationChoices, defaultConfiguration, evaluateConfiguration } from "../dist/hardware/configuration.js";

/** @param {string} value @returns {string} */
function escape(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** @param {string} name @param {string} label @param {Record<string, string>} choices @returns {string} */
function select(name, label, choices) {
  return '<label>' + label + '<select name="' + name + '" required>' + Object.entries(choices).map(([value, text]) => '<option value="' + escape(value) + '"' + (String(defaultConfiguration[name]) === value ? " selected" : "") + '>' + escape(text) + '</option>').join("") + '</select></label>';
}

/** @param {number[]} values @param {string} unit @returns {Record<string, string>} */
function numbers(values, unit) {
  return Object.fromEntries(values.map((value) => [String(value), value.toLocaleString("ru-RU") + " " + unit]));
}

/** @returns {string} */
export function renderHardwareConfigurator() {
  const initial = evaluateConfiguration(defaultConfiguration);

  if (!initial.ok) throw new Error(initial.error);

  return '<section class="solution-section container hardware-configurator" id="configuration" aria-labelledby="configuration-title"><h2 id="configuration-title">Соберите конфигурацию физического сервера</h2><p class="dialog-intro">Ниже пример параметров. Выберите свои требования или отправьте их инженеру для уточнения. Количество пользователей помогает описать задачу и само по себе не определяет необходимый объём ОЗУ.</p><div class="calculator-grid"><form class="calculator-fields" id="hardware-configuration" aria-label="Конфигурация физического сервера">' +
    '<div class="form-row">' + select("purpose", "Назначение сервера", configurationChoices.purpose) + '<label>Пользователей одновременно<input name="users" type="number" min="1" max="10000" step="1" required value="25"></label></div>' +
    '<div class="form-row">' + select("cores", "Ядер процессора", numbers(coreChoices, "ядер")) + select("ram", "Оперативная память, ГБ", numbers(ramChoices, "ГБ")) + '</div>' +
    '<div class="form-row">' + select("diskType", "Тип накопителей", configurationChoices.diskType) + '<label>Количество дисков<input name="diskCount" type="number" min="1" max="24" step="1" required value="4"></label></div>' +
    '<div class="form-row">' + select("diskSize", "Ёмкость одного диска, ТБ", numbers(diskSizeChoices, "ТБ")) + select("raid", "Дисковый массив", configurationChoices.raid) + '</div>' +
    '<div class="form-row">' + select("gpu", "Видеокарта", configurationChoices.gpu) + select("chassis", "Корпус", configurationChoices.chassis) + '</div>' +
    '<label>Бюджет на оборудование, ₽, если определён<input name="budget" type="number" min="0" max="100000000" step="any" placeholder="Можно оставить пустым"></label>' +
    '</form><div class="calculator-results" aria-live="polite" aria-atomic="true"><span>Предварительная конфигурация</span><strong id="configuration-summary">64 ГБ ОЗУ</strong><h3>Параметры для подбора оборудования</h3><dl>' +
    [['cpu', 'Процессор', '16 ядер'], ['ram', 'Оперативная память', '64 ГБ'], ['raw', 'Накопители', '4 × 2 ТБ'], ['storage', 'Объём после резервирования', initial.usableTb + ' ТБ'], ['gpu', 'Видеокарта', 'Не требуется'], ['chassis', 'Корпус', 'Напольный корпус']].map(([id, label, value]) => '<div><dt>' + label + '</dt><dd id="configuration-' + id + '">' + value + '</dd></div>').join("") +
    '</dl><p class="configuration-error" id="configuration-error" role="status" tabindex="-1"></p><p>Ёмкость указана до форматирования и служебных резервов. RAID объединяет диски и может защищать массив при отказе диска; резервные копии нужны отдельно.</p><p>Это пожелания к оборудованию. Совместимость компонентов и достаточность ресурсов проверит инженер перед предложением.</p><button class="button primary" id="configuration-submit" type="button" data-request data-configuration-request data-service="hardware-sizing">Отправить конфигурацию на подбор</button><p><a href="https://www.westerndigital.com/tools/raid-capacity-calculator" target="_blank" rel="noopener noreferrer">Как рассчитывается ёмкость массива</a></p></div></div></section>';
}
