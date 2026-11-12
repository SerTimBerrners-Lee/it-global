import { readFile, writeFile, mkdir } from "node:fs/promises";
import { infrastructureServices } from "../dist/servers/catalog.js";

const home = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const { url: origin } = JSON.parse(await readFile(new URL("../content/site.json", import.meta.url), "utf8"));
const title = "Развёртывание серверов и перенос из облака в Санкт-Петербурге | IT Global";
const description = "Развернём корпоративные серверы и серверы для ИИ на оборудовании вашей компании в Санкт-Петербурге. Перенесём системы из облаков и ЦОДов, настроим доступ и резервные копии.";
const url = new URL("/servers/", origin).href;

/** @param {string} value @returns {string} */
function escape(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

/** @param {string[]} items @returns {string} */
function checklist(items) {
  return '<ul class="extra-features">' + items.map((item) => '<li><span class="list-icon" aria-hidden="true">✓</span><span>' + escape(item) + '</span></li>').join("") + "</ul>";
}

const faq = [
  ["Вы работаете в Санкт-Петербурге?", "Да, это направление для компаний Санкт-Петербурга. Работы на площадке, подключение оборудования и выезды согласуем при оценке проекта. Часть подготовки и настройки можно выполнить удалённо."],
  ["Можно использовать наше оборудование?", "Да. Проверим характеристики, состояние дисков, нагрузку и совместимость. Если ресурсов недостаточно, предложим обновление отдельных компонентов или новую конфигурацию."],
  ["Вы продаёте сервер или оказываете услугу?", "Основное предложение: подбор, развёртывание и перенос систем. Подготовим спецификацию оборудования для закупки. Поставку, гарантию на оборудование и монтаж согласуем отдельно, если они нужны."],
  ["Что можно перенести из облака или ЦОДа?", "Виртуальные машины, приложения, базы данных и файлы, если доступны экспорт и необходимые права. Сначала проверим зависимости, лицензии, объём данных и возможность переноса. Для оборудования в ЦОДе отдельно согласуем физическое перемещение, если оно требуется."],
  ["Будет ли остановка работы при переносе?", "Это зависит от систем и способа переноса. Согласуем допустимое окно переключения, проверку данных и план возврата. Сначала проведём пробный перенос. Время остановки оценим после проверки инфраструктуры."],
  ["Что нужно для сервера в офисе или на производстве?", "Проверим место установки, питание, охлаждение, сеть, доступ в интернет и условия физического доступа. Требования к бесперебойному питанию и хранению резервных копий включим в проект."],
  ["Что входит в сервер для ИИ?", "Подбор модели и вычислительных ресурсов, установка среды запуска, доступ сотрудников и проверка скорости на выбранных задачах. Подключение документов, интеграции, дообучение моделей и обучение сотрудников можно включить отдельным этапом направления «ИИ и обучение»."],
  ["Сколько это стоит и кто будет обслуживать сервер?", "Стоимость зависит от количества систем, оборудования, данных и требований к доступности. После оценки предложим состав работ и смету. Оборудование, лицензии, подготовку площадки и сопровождение покажем отдельными строками. Режим поддержки и сроки реакции согласуем до запуска."],
];

const metadata = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": origin + "/#organization", name: "IT Global", url: origin + "/", telephone: "+79211153143", logo: origin + "/favicon.svg" },
    { "@type": "Service", name: "Развёртывание серверов и перенос инфраструктуры в Санкт-Петербурге", description, url, provider: { "@id": origin + "/#organization" }, areaServed: { "@type": "City", name: "Санкт-Петербург" } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: origin + "/" },
      { "@type": "ListItem", position: 2, name: "Серверы в Санкт-Петербурге", item: url },
    ] },
  ],
};

let head = home.slice(0, home.indexOf("<body>"))
  .replace(/<title>[\s\S]*?<\/title>/, "<title>" + escape(title) + "</title>")
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + escape(description) + '">')
  .replace(/<!-- site-meta:start -->[\s\S]*?<!-- site-meta:end -->/, '<link rel="canonical" href="' + url + '"><meta property="og:url" content="' + url + '"><meta property="og:type" content="website"><meta property="og:locale" content="ru_RU"><meta property="og:site_name" content="IT Global"><meta property="og:title" content="' + escape(title) + '"><meta property="og:description" content="' + escape(description) + '"><meta property="og:image" content="' + origin + '/assets/hero-open-source.png"><script type="application/ld+json">' + JSON.stringify(metadata) + "</script>")
  .replace('src="./app.js"', 'src="/servers/app.js"')
  .replaceAll('href="./', 'href="/');

let hero = home.slice(home.indexOf('<div class="hero-shell"'), home.indexOf('<main id="main">'))
  .replace("Корпоративные сервисы<br>на вашем сервере", "Серверы и ИИ<br>на ваших мощностях")
  .replace("Ваши сервисы на вашем сервере", "Развёртывание и перенос в Санкт-Петербурге")
  .replace("Подобрать сервисы для команды", "Нужен сервер для бизнеса")
  .replace("Бесплатное ПО · Разовое внедрение", "Файлы · Учётные системы · Приложения")
  .replace("Рассчитать экономию на подписках", "Нужен сервер для ИИ")
  .replace("С учётом сервера и внедрения", "Модели · Документы · Доступ команды")
  .replace("Экономьте от 70 000 ₽ на подписках", "От подбора оборудования до запуска")
  .replace("За первый год при подписках от 10 000 ₽/мес. и своём сервере", "Перенос по плану с проверкой и возможностью отката")
  .replace('href="#services">Для команды', 'href="#services">Услуги')
  .replace('href="#plans">Бизнесу', 'href="#plans">Форматы')
  .replace('href="/solutions/local-ai/">Локальный ИИ', 'href="/ai/">ИИ и обучение')
  .replace('href="#services">Сервисы', 'href="#services">Услуги')
  .replace('href="#plans">Внедрение', 'href="#plans">Форматы')
  .replace('<button type="button" data-catalog>Все решения</button>', '<a href="#migration">Перенос систем</a>')
  .replace(/<button type="button" class="apps-button"[\s\S]*?<\/button>/, '<a class="apps-button" href="/" aria-label="На основной сайт IT Global">↗</a>')
  .replace('class="header-cta" data-request>Подключить', 'class="header-cta" data-request>Обсудить')
  .replace('class="header-calc" data-calculator>Расчёт', 'class="header-calc" data-request>Смета')
  .replace('class="button primary double" type="button" data-request', 'class="button primary double" type="button" data-request data-service="server-setup"')
  .replace('class="button double" type="button" data-calculator', 'class="button double" type="button" data-request data-service="ai-server"')
  .replaceAll("./assets/", "/assets/");

const featureCopy = [
  ["Ваша инфраструктура<br>под вашим контролем", "Развернём серверы в офисе, на производстве или другой площадке компании. Настроим системы, хранение данных и права доступа. Передадим административные доступы и схему инфраструктуры.", "data-control"],
  ["Перенос с проверкой<br>и планом отката", "Оценим системы в облаке или дата-центре, зависимости и доступность экспорта. Проведём пробный перенос. Согласуем окно переключения и проверим работу после запуска.", "open-software"],
  ["ИИ на сервере<br>вашей компании", "Подберём ресурсы под модель и число пользователей. Настроим запуск, доступ и наблюдение за нагрузкой. Проверим скорость и качество на выбранной задаче до расширения.", "tailored-services"],
];
const features = featureCopy.map(([heading, text, image], index) => '<article class="feature' + (index === 1 ? " feature-reversed" : "") + '"><div class="feature-copy"><h2>' + heading + "</h2><p>" + text + '</p></div><div class="feature-visual"><img src="/assets/features/' + image + '.webp" srcset="/assets/features/' + image + '-720.webp 720w, /assets/features/' + image + '.webp 1355w" sizes="(max-width: 850px) calc(100vw - 32px), (max-width: 1504px) calc(50vw - 32px), 720px" width="1355" height="1160" alt="" loading="lazy" decoding="async"></div></article>').join("");

const steps = [
  ["1. Разбираем вашу задачу", "Проверяем приложения, данные, оборудование и требования к доступности. Уточняем, что переносим и где будет работать сервер."],
  ["2. Согласуем план и смету", "Фиксируем конфигурацию, состав работ, окно переключения, резервные копии и критерии приёмки."],
  ["3. Настраиваем и переносим", "Готовим сервер, проверяем пробный перенос и переключаем системы по согласованному плану."],
  ["4. Проверяем и передаём", "Проверяем доступ, приложения и восстановление. Передаём доступы, документацию и порядок сопровождения."],
];
const requirements = [
  ["Оборудование и нагрузка", "Модели серверов, объём памяти и дисков, число пользователей. Если сервера ещё нет, подберём конфигурацию."],
  ["Системы и данные", "Какие приложения работают в облаке или ЦОДе, сколько данных нужно перенести, доступны ли экспорт и лицензии."],
  ["Площадка в Санкт-Петербурге", "Место установки, питание, охлаждение и сеть. Работы на площадке включаем в согласованный план."],
  ["Условия переключения", "Когда допустима остановка, кто проверяет результат и какие системы нужно вернуть при неудачном переключении."],
];

/** @param {string[][]} items @returns {string} */
function cards(items) {
  return items.map(([heading, text]) => "<article class=\"solution-card\"><h3>" + heading + "</h3><p>" + text + "</p></article>").join("");
}

const security = home.slice(home.indexOf('<section class="security"'), home.indexOf('<section class="business'))
  .replaceAll("./assets/", "/assets/");

const footer = '<footer><div class="footer-dark"><div class="footer-top"><div><a class="brand" href="/"><span>IT</span><i aria-hidden="true"></i><span>Global</span></a><div class="footer-shortcuts"><button type="button" data-request>Заявка</button></div></div><div class="footer-links"><div><h4>Два направления</h4><a href="/ai/">ИИ и обучение команды</a><a href="/servers/">Серверы и инфраструктура</a><a href="/">Корпоративные сервисы</a></div><div><h4>Серверы</h4><a href="#plans">Для бизнеса</a><a href="#plans">Для ИИ</a><a href="#services">Подбор оборудования</a></div><div><h4>Перенос и запуск</h4><a href="#migration">Из облака и ЦОДа</a><a href="#process">Этапы работ</a><a href="#security">Безопасность</a></div><div><h4>Санкт-Петербург</h4><a href="tel:+79211153143">+7 (921) 115-31-43</a><a href="#requirements">Подготовка площадки</a><a href="#faq">Вопросы и ответы</a></div></div></div><div class="footer-note"><p>Развёртывание серверов на мощностях компании, перенос из облаков и дата-центров, локальная инфраструктура для ИИ. Работаем с компаниями Санкт-Петербурга.</p><p>Состав работ, сроки, стоимость оборудования и условия сопровождения согласуем после оценки. Работы на площадке и подготовка помещения включаются в проект отдельно.</p><p class="copyright">© 2026 IT Global <a href="#top">Наверх</a></p></div></div></footer>';

const body = '<body><a class="skip-link" href="#main">Перейти к содержанию</a>' + hero + '<main id="main">' +
  '<section class="migration container" id="migration" aria-labelledby="migration-title"><div class="migration-icon" aria-hidden="true">☁</div><div><h2 id="migration-title">Из облака и ЦОДа в вашу инфраструктуру</h2><p>Перенесём приложения, базы и файлы на оборудование компании. Проверим зависимости, подготовим копии и согласуем переключение.</p><button class="button" type="button" data-request data-service="cloud-migration">Оценить перенос</button></div></section>' +
  '<section class="services container" id="services" aria-labelledby="services-title"><div class="section-heading"><h2 id="services-title">Всё для запуска серверов<br>в вашей компании</h2></div><div class="service-grid" id="software-grid">' +
  infrastructureServices.map((service) => '<article class="service-card service-tile" data-service="' + service.id + '"><h3>' + escape(service.title) + '</h3><p>' + escape(service.description) + '</p><img class="service-logo" src="/assets/logos/' + service.logo + '" width="72" height="72" alt="" loading="lazy"><div class="software-card-actions"><button class="button" type="button" data-request data-service="' + service.id + '" aria-label="Обсудить: ' + escape(service.title) + '">Обсудить ↗</button></div></article>').join("") +
  '</div></section><section class="features container" aria-label="Результат для компании">' + features + '</section>' +
  '<section class="plans-section" id="plans"><div class="container"><h2>Два формата под вашу задачу</h2><div class="plans-grid"><article class="plan-card"><div class="plan-head"><div class="plan-intro"><h3>Корпоративный сервер</h3><p>Сервер для файлов, учётных систем, баз данных и приложений. Новый запуск или перенос действующих систем.</p></div><button class="button double plan-cta" type="button" data-request data-service="server-setup">Подобрать конфигурацию<small>Смета после оценки</small></button></div><div class="plan-body">' +
  checklist(["Проверка существующего оборудования", "Конфигурация для закупки при необходимости", "Серверная система и виртуальные машины", "Перенос согласованных приложений и данных", "Доступ, резервные копии и мониторинг", "Документация и передача вашей команде"]) +
  '</div></article><article class="plan-card featured"><div class="plan-head"><div class="plan-intro"><h3>Сервер для ИИ</h3><p>Инфраструктура для языковых моделей на мощностях компании. Подбираем оборудование под задачу и нагрузку.</p></div><button class="button double plan-cta primary" type="button" data-request data-service="ai-server">Обсудить сервер для ИИ<small>Под задачи и число пользователей</small></button></div><div class="plan-body">' +
  checklist(["Выбор модели и проверка условий использования", "Подбор памяти, дисков и видеокарт", "Установка среды запуска моделей", "Настройка доступа сотрудников", "Проверка скорости и потребления ресурсов", "План подключения документов и интеграций"]) +
  '</div></article></div><button class="button plan-bottom-button" type="button" data-request>Получить план и смету</button></div></section>' +
  security +
  '<section class="solution-section container" id="process" aria-labelledby="process-title"><h2 id="process-title">От задачи до работающего сервера</h2><div class="solution-cards">' + cards(steps) + '</div></section>' +
  '<section class="solution-section container" id="requirements" aria-labelledby="requirements-title"><h2 id="requirements-title">Что проверим перед запуском</h2><div class="solution-cards">' + cards(requirements) + '</div></section>' +
  '<section class="solutions-home container" aria-labelledby="directions-title"><h2 id="directions-title">Сервер готов. Подключим задачи бизнеса.</h2><p>Инфраструктуру можно дополнить помощником по документам, интеграциями и обучением сотрудников.</p><div class="solution-links"><a class="solution-link" href="/ai/"><h3>ИИ и обучение команды ↗</h3><p>Внедрение языковых моделей, подключение знаний компании, дообучение и практическое обучение сотрудников.</p></a><a class="solution-link" href="/"><h3>Корпоративные сервисы ↗</h3><p>Почта, файлы, документы и другие сервисы в инфраструктуре компании.</p></a></div></section>' +
  '<section class="consultation"><h2>Расскажите, что нужно запустить<br>или перенести в Санкт-Петербурге</h2><button class="button" type="button" data-request>Получить план и смету</button></section>' +
  '<section class="faq" id="faq"><h2>Вопросы и ответы</h2><div class="faq-list">' + faq.map(([question, answer]) => '<details><summary>' + question + '<span class="faq-plus" aria-hidden="true">+</span></summary><p>' + answer + '</p></details>').join("") + '</div></section></main>' + footer +
  '<dialog id="request-dialog" aria-labelledby="request-title"><button class="dialog-close" type="button" data-close aria-label="Закрыть">×</button><h2 id="request-title">Обсудить сервер или перенос</h2><p class="dialog-intro">Санкт-Петербург. Расскажите, что нужно запустить, откуда перенести системы и какое оборудование уже есть.</p><form id="request-form"><fieldset aria-label="Нужные услуги"><div id="request-options">' +
  infrastructureServices.map((service) => '<label class="service-choice"><input type="checkbox" name="services" value="' + service.id + '"><span>' + escape(service.title) + '</span></label>').join("") +
  '</div></fieldset><div class="form-row"><label>Ваше имя<input name="name" autocomplete="name" required maxlength="100" placeholder="Как к вам обращаться"></label><label>Телефон<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="30" placeholder="+7 (999) 123-45-67"></label></div><label>Компания, площадка и задача<textarea name="message" rows="3" maxlength="3000" placeholder="Какие системы нужны, где они работают сейчас и куда планируете перенос?"></textarea></label><button class="button primary" type="submit" id="request-submit">Отправить заявку</button><p id="form-status" role="status"></p><p class="dialog-intro">Имя, телефон и описание задачи будут переданы команде IT Global для ответа на заявку.</p></form></dialog></body></html>';

await mkdir(new URL("../dist/servers/", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/servers/index.html", import.meta.url), (head + body).replace(/\r\n/g, "\n"));
