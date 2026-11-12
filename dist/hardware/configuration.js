/** @typedef {{purpose: string, users: number, cores: number, ram: number, diskType: string, diskCount: number, diskSize: number, raid: string, gpu: string, chassis: string, budget: number | null}} HardwareConfiguration */
/** @typedef {{ok: true, configuration: HardwareConfiguration, rawTb: number, usableTb: number} | {ok: false, error: string}} ConfigurationResult */

export const coreChoices = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128];
export const ramChoices = [16, 32, 64, 128, 256, 512, 1024];
export const diskSizeChoices = [0.5, 1, 2, 4, 8, 12, 16, 24];

/** @type {Record<string, Record<string, string>>} */
export const configurationChoices = {
  purpose: { business: "Приложения и базы данных", virtualization: "Виртуальные машины", files: "Файлы и резервные копии", ai: "Задачи ИИ", undecided: "Помогите определить" },
  diskType: { ssd: "SSD", nvme: "NVMe SSD", hdd: "HDD", undecided: "Подобрать по задаче" },
  raid: { none: "Без отказоустойчивого массива", raid1: "Зеркало RAID 1, два диска", raid5: "RAID 5, от трёх дисков", raid6: "RAID 6, от четырёх дисков", raid10: "RAID 10, от четырёх, чётное число" },
  gpu: { none: "Не требуется", vram24: "Видеопамять 24 ГБ", vram48: "Видеопамять 48 ГБ", vram80: "Видеопамять 80 ГБ", undecided: "Подобрать под модель" },
  chassis: { tower: "Напольный корпус", rack: "Сервер для стойки", undecided: "Подобрать под площадку" },
};

/** @type {HardwareConfiguration} */
export const defaultConfiguration = { purpose: "virtualization", users: 25, cores: 16, ram: 64, diskType: "ssd", diskCount: 4, diskSize: 2, raid: "raid10", gpu: "none", chassis: "tower", budget: null };

/** @param {unknown} value @returns {ConfigurationResult} */
export function evaluateConfiguration(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Проверьте параметры конфигурации." };

  /** @type {Record<string, unknown>} */
  const fields = Object.fromEntries(Object.entries(value));

  /** @param {string} key @returns {number} */
  function number(key) {
    return typeof fields[key] === "number" ? fields[key] : NaN;
  }

  /** @param {string} key @returns {string} */
  function string(key) {
    return typeof fields[key] === "string" ? fields[key] : "";
  }

  /** @type {HardwareConfiguration} */
  const configuration = {
    purpose: string("purpose"), users: number("users"), cores: number("cores"), ram: number("ram"),
    diskType: string("diskType"), diskCount: number("diskCount"), diskSize: number("diskSize"), raid: string("raid"),
    gpu: string("gpu"), chassis: string("chassis"), budget: fields.budget === null ? null : number("budget"),
  };

  for (const field of Object.keys(configurationChoices)) {
    if (!Object.hasOwn(configurationChoices[field], string(field))) return { ok: false, error: "Выберите назначение, тип дисков, массив, видеокарту и корпус." };
  }

  if (!coreChoices.includes(configuration.cores) || !ramChoices.includes(configuration.ram)
    || !diskSizeChoices.includes(configuration.diskSize)) return { ok: false, error: "Выберите процессор, объём ОЗУ и ёмкость диска из списка." };

  if (!Number.isInteger(configuration.users) || configuration.users < 1 || configuration.users > 10000
    || !Number.isInteger(configuration.diskCount) || configuration.diskCount < 1 || configuration.diskCount > 24) return { ok: false, error: "Укажите от 1 до 10 000 пользователей и от 1 до 24 дисков, целыми числами." };

  if (configuration.budget !== null && (!Number.isFinite(configuration.budget) || configuration.budget < 0 || configuration.budget > 100000000)) return { ok: false, error: "Бюджет должен быть от 0 до 100 000 000 ₽ или оставлен пустым." };

  const { diskCount, diskSize, raid } = configuration;

  if ((raid === "raid1" && diskCount !== 2)
    || (raid === "raid5" && diskCount < 3)
    || (raid === "raid6" && diskCount < 4)
    || (raid === "raid10" && (diskCount < 4 || diskCount % 2 !== 0))) return { ok: false, error: "Для RAID 1 нужны два диска, RAID 5 от трёх, RAID 6 от четырёх, RAID 10 от четырёх с чётным количеством." };

  // Nominal capacity before filesystem overhead and spare drives.
  // https://www.westerndigital.com/tools/raid-capacity-calculator
  const rawTb = diskCount * diskSize;
  const usableTb = raid === "raid1" ? diskSize : raid === "raid10" ? rawTb / 2 : raid === "raid5" ? (diskCount - 1) * diskSize : raid === "raid6" ? (diskCount - 2) * diskSize : rawTb;
  return { ok: true, configuration, rawTb, usableTb };
}
