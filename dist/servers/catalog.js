/** @typedef {{id: string, title: string, description: string, logo: string}} InfrastructureService */

/** @type {InfrastructureService[]} */
const services = [
  { id: "infrastructure-audit", title: "Аудит инфраструктуры", description: "Разберём текущие серверы, приложения и нагрузку. Подготовим схему размещения, этапы работ и требования к площадке.", logo: "matomo.svg" },
  { id: "hardware-selection", title: "Подбор оборудования", description: "Подберём сервер, диски и сеть под ваши системы. Проверим существующее оборудование и подготовим спецификацию для закупки.", logo: "tasks.png" },
  { id: "server-setup", title: "Развёртывание серверов", description: "Установим серверную систему, настроим виртуальные машины, хранилище и доступ. Подготовим среду для приложений компании.", logo: "nextcloud.svg" },
  { id: "cloud-migration", title: "Перенос из облаков и ЦОДов", description: "Перенесём приложения, базы и файлы на оборудование компании. Сначала проведём пробный перенос, затем согласуем переключение.", logo: "onlyoffice.svg" },
  { id: "ai-server", title: "Сервер для ИИ", description: "Подберём вычислительные ресурсы и развернём языковые модели. Проверим скорость на ваших задачах и настроим доступ команды.", logo: "ollama.svg" },
  { id: "network-access", title: "Сеть и удалённый доступ", description: "Настроим сетевые подключения, защищённый доступ сотрудников и разделение прав. Согласуем подключения к действующей сети.", logo: "vaultwarden.svg" },
  { id: "backup-recovery", title: "Копии и восстановление", description: "Настроим резервное копирование и хранение копий отдельно от рабочих данных. Проверим восстановление на согласованном сценарии.", logo: "bookstack.svg" },
  { id: "monitoring", title: "Мониторинг серверов", description: "Настроим наблюдение за доступностью, дисками и нагрузкой. Определим события и получателей уведомлений.", logo: "automation.png" },
  { id: "maintenance", title: "Сопровождение инфраструктуры", description: "Согласуем обновления, проверку резервных копий и устранение сбоев. Передадим документацию и порядок обращения за поддержкой.", logo: "openproject.svg" },
];

/** @type {InfrastructureService[]} */
export const infrastructureServices = services.filter((service) => service.id !== "ai-server");

/** @type {InfrastructureService[]} */
export const aiServerServices = [
  ...services.filter((service) => ["hardware-selection", "ai-server"].includes(service.id)),
  { id: "ai-models", title: "Развёртывание моделей", description: "Установим среду запуска языковых моделей. Проверим совместимость, условия использования и выбранные рабочие сценарии.", logo: "ollama.svg" },
  { id: "ai-access", title: "Доступ команды к ИИ", description: "Настроим рабочий интерфейс, учётные записи и права сотрудников. Согласуем подключение приложений к моделям.", logo: "jitsi.svg" },
  { id: "ai-performance", title: "Проверка производительности", description: "Измерим скорость ответов и потребление ресурсов при согласованной нагрузке. Подготовим рекомендации по расширению.", logo: "matomo.svg" },
  ...services.filter((service) => ["network-access", "backup-recovery", "monitoring", "maintenance"].includes(service.id)),
];

/** @param {'infrastructure' | 'ai-infrastructure'} kind @returns {InfrastructureService[]} */
export function getInfrastructureServices(kind) {
  return kind === "ai-infrastructure" ? aiServerServices : infrastructureServices;
}
