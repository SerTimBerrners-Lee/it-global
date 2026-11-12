import { readFile, writeFile, mkdir } from "node:fs/promises";
import { getInfrastructureServices } from "../dist/servers/catalog.js";
import { serverOffers } from "../content/server-offers.js";

const home = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const { url: origin } = JSON.parse(await readFile(new URL("../content/site.json", import.meta.url), "utf8"));

/** @param {string} value @returns {string} */
function escape(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

/** @param {string[]} items @returns {string} */
function checklist(items) {
  return '<ul class="extra-features">' + items.map((item) => '<li><span class="list-icon" aria-hidden="true">✓</span><span>' + escape(item) + '</span></li>').join("") + "</ul>";
}

/** @param {string[][]} items @returns {string} */
function cards(items) {
  return items.map(([heading, text]) => '<article class="solution-card"><h3>' + escape(heading) + '</h3><p>' + escape(text) + '</p></article>').join("");
}

/** @param {import('../content/server-offers.js').ServerOffer} page @returns {string} */
function render(page) {
  const url = new URL(page.route, origin).href;
  const services = getInfrastructureServices(page.kind);
  const other = serverOffers.find((offer) => offer.kind !== page.kind);

  if (!other) throw new Error("Не найдена связанная страница серверных услуг.");

  const metadata = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": origin + "/#organization", name: "IT Global", url: origin + "/", telephone: "+79211153143", logo: origin + "/favicon.svg" },
      { "@type": "Service", name: page.label + " в Санкт-Петербурге", description: page.description, url, provider: { "@id": origin + "/#organization" }, areaServed: { "@type": "City", name: "Санкт-Петербург" } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: origin + "/" },
        { "@type": "ListItem", position: 2, name: page.label, item: url },
      ] },
    ],
  };

  const head = home.slice(0, home.indexOf("<body>"))
    .replace(/<title>[\s\S]*?<\/title>/, "<title>" + escape(page.title) + "</title>")
    .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + escape(page.description) + '">')
    .replace(/<!-- site-meta:start -->[\s\S]*?<!-- site-meta:end -->/, '<link rel="canonical" href="' + url + '"><meta property="og:url" content="' + url + '"><meta property="og:type" content="website"><meta property="og:locale" content="ru_RU"><meta property="og:site_name" content="IT Global"><meta property="og:title" content="' + escape(page.title) + '"><meta property="og:description" content="' + escape(page.description) + '"><meta property="og:image" content="' + origin + '/assets/hero-open-source.png"><script type="application/ld+json">' + JSON.stringify(metadata).replaceAll("<", "\\u003c") + "</script>")
    .replace('src="./app.js"', 'src="/servers/app.js"')
    .replaceAll('href="./', 'href="/');

  const hero = home.slice(home.indexOf('<div class="hero-shell"'), home.indexOf('<main id="main">'))
    .replace("Корпоративные сервисы<br>на вашем сервере", page.heading)
    .replace("Ваши сервисы на вашем сервере", escape(page.tagline))
    .replace("Подобрать сервисы для команды", escape(page.primary))
    .replace("Бесплатное ПО · Разовое внедрение", escape(page.primaryNote))
    .replace("Рассчитать экономию на подписках", escape(page.secondary))
    .replace("С учётом сервера и внедрения", escape(page.secondaryNote))
    .replace("Экономьте от 70 000 ₽ на подписках", escape(page.promise))
    .replace("За первый год при подписках от 10 000 ₽/мес. и своём сервере", escape(page.promiseNote))
    .replace('href="#services">Для команды', 'href="#services">Услуги')
    .replace('href="#plans">Бизнесу', 'href="#plans">Форматы')
    .replaceAll('href="/solutions/local-ai/">Локальный ИИ', 'href="' + other.route + '">' + (other.kind === "ai-infrastructure" ? "Серверы для ИИ" : "Серверы для бизнеса"))
    .replace('href="#services">Сервисы', 'href="#services">Услуги')
    .replace('href="#plans">Внедрение', 'href="#plans">Форматы')
    .replace('<button type="button" data-catalog>Все решения</button>', '<a href="/ai/">Внедрение ИИ и обучение</a>')
    .replace(/<button type="button" class="apps-button"[\s\S]*?<\/button>/, '<a class="apps-button" href="/" aria-label="На основной сайт IT Global">↗</a>')
    .replace('class="header-cta" data-request>Подключить', 'class="header-cta" data-request>Обсудить')
    .replace('class="header-calc" data-calculator>Расчёт', 'class="header-calc" data-request>Смета')
    .replace('class="button primary double" type="button" data-request', 'class="button primary double" type="button" data-request data-service="' + page.primaryService + '"')
    .replace('class="button double" type="button" data-calculator', 'class="button double" type="button" data-request data-service="' + page.secondaryService + '"')
    .replaceAll("./assets/", "/assets/");

  const features = page.features.map(([heading, text, image], index) => '<article class="feature' + (index === 1 ? " feature-reversed" : "") + '"><div class="feature-copy"><h2>' + heading + "</h2><p>" + escape(text) + '</p></div><div class="feature-visual"><img src="/assets/features/' + image + '.webp" srcset="/assets/features/' + image + '-720.webp 720w, /assets/features/' + image + '.webp 1355w" sizes="(max-width: 850px) calc(100vw - 32px), (max-width: 1504px) calc(50vw - 32px), 720px" width="1355" height="1160" alt="" loading="lazy" decoding="async"></div></article>').join("");
  const plans = page.plans.map((plan, index) => '<article class="plan-card' + (index === 1 ? " featured" : "") + '"><div class="plan-head"><div class="plan-intro"><h3>' + escape(plan.title) + '</h3><p>' + escape(plan.text) + '</p></div><button class="button double plan-cta' + (index === 1 ? " primary" : "") + '" type="button" data-request data-service="' + plan.service + '">' + escape(plan.cta) + '<small>' + escape(plan.note) + '</small></button></div><div class="plan-body">' + checklist(plan.items) + '</div></article>').join("");
  const security = home.slice(home.indexOf('<section class="security"'), home.indexOf('<section class="business'))
    .replaceAll("./assets/", "/assets/");

  const footer = '<footer><div class="footer-dark"><div class="footer-top"><div><a class="brand" href="/"><span>IT</span><i aria-hidden="true"></i><span>Global</span></a><div class="footer-shortcuts"><button type="button" data-request>Заявка</button></div></div><div class="footer-links"><div><h4>Серверные услуги</h4><a href="/servers/">Корпоративные серверы и перенос</a><a href="/ai-servers/">Серверы для ИИ</a><a href="/ai/">Внедрение ИИ и обучение</a></div><div><h4>На этой странице</h4><a href="#services">Услуги</a><a href="#plans">Форматы работ</a><a href="#process">Этапы запуска</a></div><div><h4>Подготовка</h4><a href="#requirements">Что проверим</a><a href="#security">Безопасность</a><a href="#faq">Вопросы и ответы</a></div><div><h4>Санкт-Петербург</h4><a href="tel:+79211153143">+7 (921) 115-31-43</a><a href="/">Основной сайт</a><a href="#top">Наверх</a></div></div></div><div class="footer-note"><p>' + escape(page.description) + '</p><p>Состав работ, сроки, стоимость оборудования и условия сопровождения согласуем после оценки. Работы на площадке и подготовка помещения включаются в проект отдельно.</p><p class="copyright">© 2026 IT Global <a href="#top">Наверх</a></p></div></div></footer>';

  const body = '<body data-offer="' + page.kind + '"><a class="skip-link" href="#main">Перейти к содержанию</a>' + hero + '<main id="main">' +
    '<section class="migration container" id="migration" aria-labelledby="migration-title"><div class="migration-icon" aria-hidden="true">☁</div><div><h2 id="migration-title">' + escape(page.banner.title) + '</h2><p>' + escape(page.banner.text) + '</p><button class="button" type="button" data-request data-service="' + page.banner.service + '">' + escape(page.banner.cta) + '</button></div></section>' +
    '<section class="services container" id="services" aria-labelledby="services-title"><div class="section-heading"><h2 id="services-title">' + page.servicesHeading + '</h2></div><div class="service-grid" id="software-grid">' +
    services.map((service) => '<article class="service-card service-tile" data-service="' + service.id + '"><h3>' + escape(service.title) + '</h3><p>' + escape(service.description) + '</p><img class="service-logo" src="/assets/logos/' + service.logo + '" width="72" height="72" alt="" loading="lazy"><div class="software-card-actions"><button class="button" type="button" data-request data-service="' + service.id + '" aria-label="Обсудить: ' + escape(service.title) + '">Обсудить ↗</button></div></article>').join("") +
    '</div></section><section class="features container" aria-label="Результат для компании">' + features + '</section>' +
    '<section class="plans-section" id="plans"><div class="container"><h2>' + escape(page.plansHeading) + '</h2><div class="plans-grid">' + plans + '</div><button class="button plan-bottom-button" type="button" data-request>Получить план и смету</button></div></section>' +
    security +
    '<section class="solution-section container" id="process" aria-labelledby="process-title"><h2 id="process-title">От задачи до работающего сервера</h2><div class="solution-cards">' + cards(page.steps) + '</div></section>' +
    '<section class="solution-section container" id="requirements" aria-labelledby="requirements-title"><h2 id="requirements-title">Что проверим перед запуском</h2><div class="solution-cards">' + cards(page.requirements) + '</div></section>' +
    '<section class="solutions-home container" aria-labelledby="directions-title"><h2 id="directions-title">Другие задачи для вашей компании</h2><div class="solution-links"><a class="solution-link" href="' + other.route + '"><h3>' + escape(other.label) + ' ↗</h3><p>' + escape(other.description) + '</p></a><a class="solution-link" href="/ai/"><h3>Внедрение ИИ и обучение команды ↗</h3><p>Подключение знаний компании, дообучение моделей, интеграции и практическое обучение сотрудников.</p></a></div></section>' +
    '<section class="consultation"><h2>' + page.closingHeading + '</h2><button class="button" type="button" data-request>Получить план и смету</button></section>' +
    '<section class="faq" id="faq"><h2>Вопросы и ответы</h2><div class="faq-list">' + page.faq.map(([question, answer]) => '<details><summary>' + escape(question) + '<span class="faq-plus" aria-hidden="true">+</span></summary><p>' + escape(answer) + '</p></details>').join("") + '</div></section></main>' + footer +
    '<dialog id="request-dialog" aria-labelledby="request-title"><button class="dialog-close" type="button" data-close aria-label="Закрыть">×</button><h2 id="request-title">' + escape(page.requestTitle) + '</h2><p class="dialog-intro">' + escape(page.requestIntro) + '</p><form id="request-form"><fieldset aria-label="Нужные услуги"><div id="request-options">' +
    services.map((service) => '<label class="service-choice"><input type="checkbox" name="services" value="' + service.id + '"><span>' + escape(service.title) + '</span></label>').join("") +
    '</div></fieldset><div class="form-row"><label>Ваше имя<input name="name" autocomplete="name" required maxlength="100" placeholder="Как к вам обращаться"></label><label>Телефон<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="30" placeholder="+7 (999) 123-45-67"></label></div><label>Компания, площадка и задача<textarea name="message" rows="3" maxlength="3000" placeholder="' + escape(page.placeholder) + '"></textarea></label><button class="button primary" type="submit" id="request-submit">Отправить заявку</button><p id="form-status" role="status"></p><p class="dialog-intro">Имя, телефон и описание задачи будут переданы команде IT Global для ответа на заявку.</p></form></dialog></body></html>';

  return (head + body).replace(/\r\n/g, "\n");
}

for (const page of serverOffers) {
  const directory = new URL("../dist" + page.route, import.meta.url);

  await mkdir(directory, { recursive: true });
  await writeFile(new URL("index.html", directory), render(page));
}
