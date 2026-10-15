import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { services } from "../dist/services.js";
import { serviceCard } from "../dist/catalog.js";

/** @typedef {{title: string, text: string}} Item */
/** @typedef {{question: string, answer: string}} Question */
/** @typedef {{slug: string, navTitle: string, title: string, description: string, heading: string, intro: string, visual: string, outputTitle: string, outputText: string, useCaseHeading: string, useCases: Item[], process: Item[], requirementsHeading: string, requirements: Item[], faq: Question[], requestText: string, section?: 'solutions' | 'services', requestServiceId?: string | null, sources?: {title: string, url: string}[]}} Solution */

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
/** @type {{url: string | null, metrikaId?: number | null}} */
const site = JSON.parse(await readFile(path.join(root, "content/site.json"), "utf8"));
/** @type {Solution[]} */
const aiPages = JSON.parse(await readFile(path.join(root, "content/solutions.json"), "utf8"));
/** @type {Solution[]} */
const servicePages = JSON.parse(await readFile(path.join(root, "content/services-pages.json"), "utf8"));
const pages = [...aiPages, ...servicePages.map((page) => ({ ...page, section: /** @type {const} */ ("services") }))];
const origin = site.url ? new URL(site.url) : null;

if (origin && (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash)) {
  throw new Error("В content/site.json нужен HTTPS-адрес сайта без пути и параметров.");
}

if (site.metrikaId != null && (!Number.isSafeInteger(site.metrikaId) || site.metrikaId <= 0)) {
  throw new Error("Номер счётчика Метрики должен быть положительным целым числом.");
}

if (new Set(pages.map((page) => page.slug)).size !== pages.length) {
  throw new Error("Адреса страниц должны быть уникальными.");
}

/** @param {string} value @returns {string} */
function escape(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

/** @param {string} slug @param {string} [section] @returns {string} */
function route(slug, section = "solutions") {
  return `/${section}/${slug}/`;
}

/** @param {string} pathname @returns {string | undefined} */
function absolute(pathname) {
  return origin ? new URL(pathname, origin).href : undefined;
}

/** @param {string} title @param {string} description @param {string} pathname @param {boolean} [isService] @returns {string} */
function metadata(title, description, pathname, isService = false) {
  const url = absolute(pathname);
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": absolute("/#organization"), name: "IT Global", url: absolute("/"), telephone: "+79211153143", logo: absolute("/favicon.svg"), contactPoint: { "@type": "ContactPoint", telephone: "+79211153143", contactType: "sales", availableLanguage: "Russian" } },
      isService
        ? { "@type": "Service", name: title.replace(/\s*[|]\s*IT Global$/, ""), description, url, provider: { "@id": absolute("/#organization") } }
        : { "@type": "WebSite", name: "IT Global", description, url },
    ],
  };

  return `${url ? `<link rel="canonical" href="${escape(url)}">\n<meta property="og:url" content="${escape(url)}">` : ""}
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="IT Global">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
${origin ? `<meta property="og:image" content="${escape(absolute("/assets/hero-open-source.png"))}">` : ""}
<script type="application/ld+json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>`;
}

/** @param {Solution[]} list @returns {string} */
function solutionLinks(list) {
  return list.map((page) => `<a class="solution-link" href="${route(page.slug, page.section)}"><h3>${escape(page.navTitle)}</h3><p>${escape(page.description)}</p></a>`).join("\n");
}

/** @param {Item[]} items @returns {string} */
function cards(items) {
  return items.map((item) => `<article class="solution-card"><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></article>`).join("\n");
}

/** @param {Solution} page @returns {string} */
function renderPage(page) {
  const isService = page.section === "services";
  const service = services.find((item) => item.id === page.requestServiceId);
  const request = `/?request=${isService ? service?.id || "consultation" : "local-ai"}&task=${encodeURIComponent(page.requestText)}#services`;
  const breadcrumbs = [{ name: "Главная", path: "/" }];

  if (!isService && page.slug !== "local-ai") breadcrumbs.push({ name: "Локальный ИИ", path: route("local-ai") });

  breadcrumbs.push({ name: page.navTitle, path: route(page.slug, page.section) });
  const breadcrumbData = origin ? `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumbs.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absolute(item.path) })) }).replaceAll("<", "\\u003c")}</script>` : "";
  const related = pages.filter((item) => item.section === page.section && item.slug !== page.slug);
  const symbol = isService
    ? service ? `<img src="/assets/logos/${escape(service.logo)}" alt="" width="88" height="88">` : '<div class="demo-services" aria-hidden="true"><img src="/assets/logos/mailu.png" alt="" width="64" height="64"><img src="/assets/logos/nextcloud.svg" alt="" width="64" height="64"><img src="/assets/logos/onlyoffice.svg" alt="" width="64" height="64"></div>'
    : page.visual === "speech" || page.visual === "transcription" ? '<span class="demo-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>' : '<img src="/assets/logos/ollama.svg" alt="" width="72" height="72">';

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#f0eee7">
<title>${escape(page.title)}</title>
<meta name="description" content="${escape(page.description)}">
${metadata(page.title, page.description, route(page.slug, page.section), true)}
${breadcrumbData}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/ys-text-display-wide.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/ys-text-regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/solutions.css">
<link rel="stylesheet" href="/phone.css">
<script type="module" src="/analytics.js"></script>
</head>
<body class="solution-page">
<a class="skip-link" href="#main">Перейти к содержанию</a>
<header class="header solution-header">
<a class="brand" href="/" aria-label="IT Global на главную"><span>IT</span><i aria-hidden="true"></i><span>Global</span></a>
<a class="header-phone" href="tel:+79211153143">+7 (921) 115-31-43</a>
<nav class="solution-nav" aria-label="Главное меню"><a href="/#services">Все сервисы</a><a href="/solutions/local-ai/">Локальный ИИ</a><a href="/#plans">Стоимость</a></nav>
<a class="button primary" href="${escape(request)}">Обсудить задачу</a>
</header>
<main id="main">
<div class="solution-hero-shell">
<nav class="breadcrumbs container" aria-label="Хлебные крошки">${breadcrumbs.map((item, index) => index === breadcrumbs.length - 1 ? `<span aria-current="page">${escape(item.name)}</span>` : `<a href="${item.path}">${escape(item.name)}</a><span aria-hidden="true">/</span>`).join("")}</nav>
<section class="solution-hero container" aria-labelledby="solution-title">
<div class="solution-copy"><h1 id="solution-title">${escape(page.heading)}</h1><p>${escape(page.intro)}</p><a class="button primary" href="${escape(request)}">${isService ? "Обсудить внедрение" : "Подобрать модель под задачу"}</a><span class="solution-hero-note">На вашем сервере. С настройкой и годом поддержки.</span></div>
<div class="solution-demo solution-demo-${escape(page.visual)}" aria-label="Иллюстрация сценария">
<div class="demo-top"><span class="demo-status" aria-hidden="true"></span>На вашем сервере</div>
<div class="demo-symbol" aria-hidden="true">${symbol}</div>
<div class="demo-result"><h2>${escape(page.outputTitle)}</h2><p>${escape(page.outputText)}</p></div><p class="demo-caption">${isService ? "Сценарий использования" : "Пример результата"}</p>
</div>
</section>
</div>
<section class="solution-section container" aria-labelledby="use-cases"><h2 id="use-cases">${escape(page.useCaseHeading)}</h2><div class="solution-cards">${cards(page.useCases)}</div></section>
<section class="solution-section solution-process container" aria-labelledby="process"><h2 id="process">Что сделаем для запуска</h2><div class="solution-cards">${cards(page.process)}</div></section>
<section class="solution-section container" aria-labelledby="requirements"><h2 id="requirements">${escape(page.requirementsHeading)}</h2><div class="solution-cards">${cards(page.requirements)}</div></section>
<section class="solution-offer container" aria-labelledby="offer"><div><h2 id="offer">Разовое внедрение, год поддержки</h2><p>Один сервис за 9 900 ₽ или весь набор за 49 900 ₽. ${isService ? "Настроим выбранные сервисы и передадим доступы вашей команде." : "Подберём модель, настроим запуск и передадим доступы вашей команде."}</p><p>Оборудование и аренда сервера оплачиваются отдельно. ${isService ? "Коммерческие дополнения, лицензии и дополнительные работы согласуем отдельно." : "Требования к памяти и видеокарте зависят от модели и нагрузки."} Состав работ согласуем до внедрения.</p></div><a class="button primary" href="${escape(request)}">Подготовить заявку</a></section>
<section class="solution-section solution-faq container" aria-labelledby="questions"><h2 id="questions">Вопросы и ответы</h2><div class="faq-list">${page.faq.map((item) => `<details><summary>${escape(item.question)}<span class="faq-plus" aria-hidden="true">+</span></summary><p>${escape(item.answer)}</p></details>`).join("\n")}</div></section>
${page.sources?.length ? `<div class="solution-sources container"><p>Возможности и ограничения: ${page.sources.map((source) => `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>`).join(", ")}. Проверено 15 октября 2026 года.</p></div>` : ""}
<section class="solution-section container" aria-labelledby="related"><h2 id="related">${isService ? "Другие сервисы для вашей команды" : "Другие задачи для локального ИИ"}</h2><div class="solution-links">${solutionLinks(related)}</div></section>
</main>
<footer class="solution-footer"><div class="container"><a class="brand" href="/"><span>IT</span><i aria-hidden="true"></i><span>Global</span></a><nav aria-label="Решения">${pages.map((item) => `<a href="${route(item.slug, item.section)}">${escape(item.navTitle)}</a>`).join("")}<a href="/#services">Все сервисы</a></nav><p>Подбор и внедрение открытого ПО в вашей инфраструктуре. Лицензии и необходимые ресурсы проверяем до запуска.</p><a class="footer-contact" href="tel:+79211153143">+7 (921) 115-31-43</a><p>© 2026 IT Global</p></div></footer>
</body>
</html>
`;
}

for (const page of pages) {
  if (!/^[a-z][a-z-]+$/.test(page.slug)) throw new Error("Некорректный адрес страницы.");

  const directory = path.join(dist, page.section || "solutions", page.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), renderPage(page));
}

let home = await readFile(path.join(dist, "index.html"), "utf8");
const homeTitle = "Внедрение сервисов на вашем сервере от 9 900 ₽ | IT Global";
const homeDescription = "Настроим почту, файлы, документы, CRM и локальный ИИ на вашем сервере. Один сервис за 9 900 ₽ или набор за 49 900 ₽. Год поддержки каждого сервиса.";
const seo = `<!-- site-meta:start -->${metadata(homeTitle, homeDescription, "/")}<!-- site-meta:end -->`;
home = home.replace(/<title>[^<]*<\/title>/, `<title>${homeTitle}</title>`)
  .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escape(homeDescription)}">`)
  .replace(/<h1>[\s\S]*?<\/h1>/, "<h1>Корпоративные сервисы<br>на вашем сервере</h1>");
home = home.includes("<!-- site-meta:start -->")
  ? home.replace(/<!-- site-meta:start -->[\s\S]*?<!-- site-meta:end -->/, seo)
  : home.replace("</head>", `${seo}</head>`);
const links = `<!-- solution-links:start --><section class="solutions-home container" aria-labelledby="solutions-heading"><h2 id="solutions-heading">Локальный ИИ под ваши задачи</h2><p>Развернём модели для текста, речи и работы с документами в вашей инфраструктуре.</p><div class="solution-links">${solutionLinks(aiPages)}</div></section><!-- solution-links:end -->`;
home = home.includes("<!-- solution-links:start -->")
  ? home.replace(/<!-- solution-links:start -->[\s\S]*?<!-- solution-links:end -->/, links)
  : home.replace('<section class="consultation"', `${links}\n<section class="consultation"`);
const catalog = `<!-- catalog:start --><div class="service-grid" id="software-grid">${services.map((service) => serviceCard(service, false, true)).join("\n")}</div><!-- catalog:end -->`;
home = home.includes("<!-- catalog:start -->")
  ? home.replace(/<!-- catalog:start -->[\s\S]*?<!-- catalog:end -->/, catalog)
  : home.replace('<div class="service-grid" id="software-grid"></div>', catalog);
home = home.replace(/(<p[^>]*id="catalog-result-count"[^>]*>)[\s\S]*?<\/p>/, `$1Найдено сервисов: ${services.length} из ${services.length}</p>`);

for (const service of services.filter((item) => item.page)) {
  const button = new RegExp(`<button type="button" data-details="${service.id}">([^<]+)</button\\s*>`, "g");
  home = home.replace(button, `<a href="${service.page}">$1</a>`);
}

home = home.replace('<button type="button" class="button" data-journey>Подробнее</button>', '<a class="button" href="/services/cloud-migration/">Подробнее</a>');
await writeFile(path.join(dist, "index.html"), home);

await writeFile(path.join(dist, "analytics-config.js"), `// Generated by scripts/build-pages.mjs.\nexport const metrikaId = ${site.metrikaId ?? "null"};\n`);

if (origin) {
  const urls = ["/", ...pages.map((page) => route(page.slug, page.section))];
  await writeFile(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escape(absolute(url))}</loc></url>`).join("\n")}\n</urlset>\n`);
} else {
  await rm(path.join(dist, "sitemap.xml"), { force: true });
}

await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\n${origin ? `\nSitemap: ${absolute("/sitemap.xml")}\n` : ""}`);
console.log(`Готово страниц: ${pages.length}. ${origin ? "Карта сайта и canonical обновлены." : "Домен ещё не задан: canonical и sitemap будут добавлены после настройки content/site.json."}`);
