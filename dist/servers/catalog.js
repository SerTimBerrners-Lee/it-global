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
export const infrastructureServices = services.filter((service) => !["ai-server", "hardware-selection"].includes(service.id));

/** @type {InfrastructureService[]} */
export const hardwareServices = [
  { id: "hardware-audit", title: "Проверка оборудования", description: "Оценим существующий сервер, его ресурсы и состояние. Определим, можно ли использовать его под вашу задачу.", logo: "matomo.svg" },
  { id: "hardware-sizing", title: "Расчёт конфигурации", description: "Подберём процессор, ОЗУ, диски и сетевые интерфейсы под приложения, объём данных и нагрузку.", logo: "tasks.png" },
  { id: "hardware-selection", title: "Спецификация для закупки", description: "Подготовим перечень совместимых компонентов и требования к серверу. Согласуем бюджет и запас для расширения.", logo: "onlyoffice.svg" },
  { id: "hardware-assembly", title: "Сборка и конфигурирование", description: "Согласуем сборку или комплектацию готового сервера. Проверим память, диски, контроллеры и настройки оборудования.", logo: "automation.png" },
  { id: "hardware-installation", title: "Установка на площадке", description: "Проверим место, питание, охлаждение и сеть. Согласуем физическую установку и подключение в Санкт-Петербурге.", logo: "nextcloud.svg" },
  { id: "hardware-testing", title: "Проверка перед передачей", description: "Проведём согласованные проверки оборудования и нагрузки. Передадим спецификацию, настройки и результаты проверки.", logo: "vaultwarden.svg" },
];

/** @param {'infrastructure' | 'hardware'} kind @returns {InfrastructureService[]} */
export function getInfrastructureServices(kind) {
  return kind === "hardware" ? hardwareServices : infrastructureServices;
}
