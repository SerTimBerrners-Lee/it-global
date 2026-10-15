/**
 * @typedef {Object} Service
 * @property {string} id
 * @property {string} title
 * @property {string} product
 * @property {'work' | 'communication' | 'business'} category
 * @property {string} description
 * @property {string[]} replaces
 * @property {string} detail
 * @property {string} limitation
 * @property {string} url
 * @property {string} license
 * @property {string} logo
 * @property {string} [page]
 */

/** @type {Service[]} */
export const services = [
  {
    id: "local-ai",
    title: "Локальные ИИ-модели",
    product: "Локальный ИИ",
    logo: "ollama.svg",
    page: "/solutions/local-ai/",
    category: "business",
    description:
      "Модели для текста, транскрибации, синтеза речи и работы с документами на вашем сервере.",
    replaces: ["ChatGPT", "Claude", "Notta", "ElevenLabs"],
    detail:
      "Подберём и развернём локальную модель под вашу задачу. Настроим работу с текстом, расшифровку записей, озвучку или помощника по документам. Проверим результат на ваших примерах и подключим нужные рабочие сервисы.",
    limitation:
      "Качество, скорость и требования к памяти или видеокарте зависят от выбранной модели и нагрузки. Лицензии моделей и голосов проверяем отдельно. Аренда сервера и оборудование оплачиваются отдельно; универсальный VDS за 3 000 ₽ подходит не для каждой ИИ-задачи.",
    url: "https://ollama.com/",
    license: "Ollama: MIT; у моделей, голосов и дополнительных компонентов собственные лицензии",
  },
  {
    id: "mail",
    title: "Корпоративная почта",
    product: "Mailu",
    logo: "mailu.png",
    page: "/services/mailu/",
    category: "communication",
    description:
      "Почта на вашем домене с веб-интерфейсом и защитой от спама без платы за ящики.",
    replaces: ["Яндекс 360", "Google Workspace"],
    detail:
      "Развернём Mailu на вашем сервере, подключим домен и настроим почтовые ящики, веб-почту, фильтрацию спама и права администраторов. Согласуем перенос писем и резервное копирование. Лицензионной платы за ящики нет.",
    limitation:
      "Нужны сервер, домен, публичный IP и настройка почтовых записей домена. Доставляемость зависит от репутации адреса и политики провайдера. При включённом антивирусе требуется минимум 3 ГБ памяти и 1 ГБ файла подкачки; ресурсы и обслуживание подбираем по нагрузке.",
    url: "https://mailu.io/",
    license: "MIT для Mailu; у включённых компонентов собственные лицензии",
  },
  {
    id: "files",
    title: "Файлы и календари",
    product: "Nextcloud",
    logo: "nextcloud.svg",
    page: "/services/nextcloud/",
    category: "work",
    description:
      "Общие папки, файлы и календари с доступом с компьютера и телефона.",
    replaces: ["Яндекс Диск", "Google Drive", "Dropbox"],
    detail:
      "Настроим Nextcloud на выбранном сервере: общие папки, права доступа, ссылки для обмена и синхронизацию. Добавим календари и согласованные приложения. Данные размещаются в выбранной вами инфраструктуре.",
    limitation:
      "Хранилище и число одновременных пользователей ограничены ресурсами сервера. Офисный редактор подключается отдельно; некоторые приложения и коммерческая поддержка имеют свои условия.",
    url: "https://nextcloud.com/fairusepolicy/",
    license: "GNU AGPLv3 для ядра; у приложений собственные лицензии",
  },
  {
    id: "documents",
    title: "Совместные документы",
    product: "ONLYOFFICE Docs Community",
    logo: "onlyoffice.svg",
    page: "/services/onlyoffice/",
    category: "work",
    description:
      "Документы, таблицы и презентации с совместным редактированием в браузере.",
    replaces: ["Google Docs", "Яндекс Документы"],
    detail:
      "Подключим офисный редактор к вашему файловому пространству. Сотрудники смогут вместе работать с документами, таблицами и презентациями в браузере. Совместимость важных файлов проверим на ваших примерах.",
    limitation:
      "С версии 9.4 в Community снят лимит 20 одновременных соединений. Разработчик рекомендует эту редакцию для небольших команд; производительность проверяем на вашем сервере. Поддержка разработчика и часть корпоративных возможностей доступны в коммерческой редакции.",
    url: "https://www.onlyoffice.com/compare-editions",
    license: "GNU AGPLv3 для Community Edition",
  },
  {
    id: "meetings",
    title: "Видеовстречи",
    product: "Jitsi Meet",
    logo: "jitsi.svg",
    category: "communication",
    description:
      "Видеовстречи на собственном домене с настройками доступа для команды.",
    replaces: ["Zoom", "Google Meet", "Яндекс Телемост"],
    detail:
      "Развернём Jitsi Meet на вашем домене и настроим доступ к встречам. Подберём сервер и канал связи под число участников. Возможность записи и дополнительные функции обсудим при подборе решения.",
    limitation:
      "Число участников и качество связи зависят от сервера, сети и устройств. Запись встреч требует дополнительных компонентов и ресурсов. Обслуживание инфраструктуры остаётся необходимым.",
    url: "https://jitsi.org/downloads/",
    license: "Apache 2.0",
  },
  {
    id: "tasks",
    title: "Задачи и проекты",
    product: "Huly",
    logo: "tasks.png",
    category: "work",
    description:
      "Задачи, проекты и совместная работа в одном пространстве вашей команды.",
    replaces: ["Яндекс Трекер", "Jira", "Linear"],
    detail:
      "Настроим проекты, статусы и процессы в Huly на вашем сервере. Команда сможет планировать работу и отслеживать задачи в собственном пространстве. Нужные интеграции согласуем перед внедрением.",
    limitation:
      "Не все сервисы облачной версии входят в готовый комплект self-hosted. Для некоторых интеграций и дополнительных функций нужна отдельная настройка; сервер требует обслуживания.",
    url: "https://docs.huly.io/getting-started/self-host/",
    license: "Eclipse Public License 2.0",
  },
  {
    id: "crm",
    page: "/services/espocrm/",
    title: "CRM",
    product: "EspoCRM",
    logo: "crm.png",
    category: "business",
    description:
      "Контакты, сделки и обращения клиентов в CRM под контролем вашей компании.",
    replaces: ["amoCRM", "Битрикс24"],
    detail:
      "Настроим бесплатное ядро EspoCRM: контакты, компании, сделки и обращения. Подберём поля и представления под ваши процессы. Проверим нужные интеграции и возможности переноса данных до начала работ.",
    limitation:
      "Бесплатно ядро CRM. Официальные расширения для продвинутых отчётов, автоматизации и части бизнес-функций платные; их условия и необходимость проверяем отдельно.",
    url: "https://www.espocrm.com/download/",
    license: "GNU AGPLv3 для ядра; отдельные лицензии расширений",
  },
  {
    id: "knowledge",
    title: "База знаний",
    product: "BookStack",
    logo: "bookstack.svg",
    category: "work",
    description:
      "Инструкции, регламенты и знания компании с поиском и управлением доступом.",
    replaces: ["Confluence", "Notion"],
    detail:
      "Соберём документацию в книги, главы и страницы. Настроим поиск и доступ для отделов, поможем перенести согласованные материалы. BookStack бесплатен и не тарифицируется по числу пользователей.",
    limitation:
      "Это база знаний со структурой «книги, главы, страницы». Возможности баз данных и автоматизации других платформ могут отличаться; перенос форматов и структуры проверяем отдельно.",
    url: "https://www.bookstackapp.com/",
    license: "MIT",
  },
  {
    id: "erp",
    title: "ERP и учёт",
    product: "ERPNext",
    logo: "erpnext.svg",
    category: "business",
    description:
      "Закупки, склад, продажи и бизнес-процессы в единой открытой системе.",
    replaces: ["Облачные ERP", "Разрозненные таблицы"],
    detail:
      "Развернём ERPNext и настроим согласованные модули для закупок, склада, продаж и других процессов. Программа бесплатна при собственном размещении; состав внедрения определяем по задачам компании.",
    limitation:
      "Требования к учёту, интеграциям и российской отчётности проверяем отдельно. Не обещаем полную замену специализированных учётных систем; настройка и обслуживание требуют ресурсов.",
    url: "https://docs.frappe.io/erpnext/open-source",
    license: "GNU GPLv3",
  },
  {
    id: "chat",
    title: "Командный чат",
    product: "Zulip",
    logo: "zulip.svg",
    category: "communication",
    description:
      "Обсуждения по темам, история переписки и интеграции на вашем сервере.",
    replaces: ["Slack", "Microsoft Teams"],
    detail:
      "Развернём командный чат с каналами, обсуждениями по темам и поиском по истории. Настроим роли и согласованные интеграции. Все функции самого чата доступны в собственном размещении Zulip.",
    limitation:
      "Для обычного бизнеса бесплатные мобильные push-уведомления доступны максимум 10 пользователям. Для большей команды есть платный тариф уведомлений; сервер и поддержка оплачиваются отдельно.",
    url: "https://project.zulip.com/self-hosting/",
    license: "Apache 2.0",
  },
  {
    id: "passwords",
    title: "Рабочие пароли",
    product: "Vaultwarden",
    logo: "vaultwarden.svg",
    category: "business",
    description:
      "Общее хранилище паролей с разграничением доступа и двухфакторной защитой.",
    replaces: ["1Password", "LastPass"],
    detail:
      "Настроим собственное хранилище рабочих паролей, коллекции и доступ сотрудников. Vaultwarden совместим с клиентами Bitwarden. Согласуем резервное копирование и порядок восстановления доступа.",
    limitation:
      "Vaultwarden: независимый community-проект, а не официальный сервер Bitwarden. Совместимость клиентов и необходимые функции проверяем отдельно; гарантированный SLA в бесплатный продукт не входит.",
    url: "https://github.com/dani-garcia/vaultwarden",
    license: "GNU AGPLv3",
  },
  {
    id: "projects",
    title: "Планирование проектов",
    product: "OpenProject Community",
    logo: "openproject.svg",
    category: "work",
    description: "Планы, сроки, задачи и диаграммы Ганта для всей команды.",
    replaces: ["Asana", "Monday.com", "Microsoft Project"],
    detail:
      "Установим OpenProject Community, настроим проекты, роли и рабочие процессы. Бесплатная редакция позволяет создавать неограниченное число пользователей и проектов.",
    limitation:
      "Часть дополнительных функций доступна только в Enterprise. Ресурсы сервера, интеграции и перенос ваших проектов согласуем до запуска.",
    url: "https://www.openproject.org/community-edition/",
    license: "GNU GPLv3 для Community Edition",
  },
  {
    id: "support",
    title: "Общение с клиентами",
    product: "Chatwoot Community",
    logo: "chatwoot.svg",
    category: "business",
    description: "Чат на сайте и общий ящик обращений для команды поддержки.",
    replaces: ["Intercom", "Zendesk"],
    detail:
      "Развернём бесплатную Community Edition Chatwoot, подключим чат на сайте и согласованные каналы обращений. Настроим операторов, распределение диалогов и ответы клиентам.",
    limitation:
      "Enterprise-функции имеют отдельную лицензию. Подключение внешних каналов может требовать оплаты их провайдерам; нужные интеграции проверим заранее.",
    url: "https://github.com/chatwoot/chatwoot",
    license: "MIT для Community Edition",
  },
  {
    id: "automation",
    title: "Автоматизация процессов",
    product: "Activepieces Community",
    logo: "automation.png",
    category: "business",
    description:
      "Связи между сервисами и автоматические действия без ручной рутины.",
    replaces: ["Zapier", "Make"],
    detail:
      "Установим Community Edition Activepieces и соберём согласованные сценарии: передача заявок, уведомления и синхронизация данных между сервисами.",
    limitation:
      "Открытое ядро распространяется по MIT. Enterprise-функции и внешние платные API не входят в бесплатную редакцию. Доступность нужных подключений проверим до внедрения.",
    url: "https://github.com/activepieces/activepieces",
    license: "MIT для Community Edition",
  },
  {
    id: "analytics",
    title: "Аналитика сайта",
    product: "Matomo",
    logo: "matomo.svg",
    category: "business",
    description:
      "Посещения, источники трафика и цели с хранением данных у вас.",
    replaces: ["Google Analytics", "Яндекс Метрика"],
    detail:
      "Развернём Matomo On-Premise, подключим сайты и настроим согласованные цели и отчёты. Данные аналитики будут храниться в вашей инфраструктуре.",
    limitation:
      "Бесплатно открытое ядро. Некоторые расширения платные. Нагрузку, срок хранения данных и настройки приватности согласуем при подборе.",
    url: "https://github.com/matomo-org/matomo",
    license: "GNU GPLv3 или более поздняя версия",
  },
  {
    id: "marketing",
    title: "Рассылки и маркетинг",
    product: "Mautic",
    logo: "mautic.svg",
    category: "business",
    description: "Сегменты аудитории, email-кампании и сценарии коммуникации.",
    replaces: ["Mailchimp", "Customer.io"],
    detail:
      "Настроим Mautic на вашем сервере, импортируем согласованные контакты и подготовим сценарии рассылок. Подключим выбранный сервис доставки писем.",
    limitation:
      "Доставка писем, SMS и внешние каналы могут оплачиваться отдельно. До запуска проверим согласия получателей, интеграции и требования к почтовой инфраструктуре.",
    url: "https://github.com/mautic/mautic",
    license: "GNU GPLv3",
  },
  {
    id: "design",
    title: "Совместный дизайн",
    product: "Penpot",
    logo: "penpot.svg",
    category: "work",
    description:
      "Интерфейсы, прототипы и дизайн-компоненты в общем пространстве.",
    replaces: ["Figma", "Sketch"],
    detail:
      "Установим Penpot в вашей инфраструктуре, создадим команды и настроим совместную работу дизайнеров и разработчиков.",
    limitation:
      "Совместимость исходных макетов, шрифтов и плагинов проверим на ваших материалах. Инфраструктура и перенос проектов требуют отдельной настройки.",
    url: "https://github.com/penpot/penpot",
    license: "Mozilla Public License 2.0",
  },
];
