import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** @typedef {{title: string, text: string}} Item */
/** @typedef {{question: string, answer: string}} Question */
/** @typedef {{slug: string, navTitle: string, title: string, description: string, heading: string, intro: string, visual: string, outputTitle: string, outputText: string, useCaseHeading: string, useCases: Item[], process: Item[], requirementsHeading: string, requirements: Item[], faq: Question[], requestText: string}} Solution */

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
/** @type {{url: string | null}} */
const site = JSON.parse(await readFile(path.join(root, "content/site.json"), "utf8"));
/** @type {Solution[]} */
const pages = JSON.parse(await readFile(path.join(root, "content/solutions.json"), "utf8"));
const origin = site.url ? new URL(site.url) : null;

if (origin && (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash)) {
  throw new Error("В content/site.json нужен HTTPS-адрес сайта без пути и параметров.");
}

if (new Set(pages.map((page) => page.slug)).size !== pages.length) {
  throw new Error("Адреса страниц должны быть уникальными.");
}

/** @param {string} value @returns {string} */
function escape(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

/** @param {string} slug @returns {string} */
function route(slug) {
  return `/solutions/${slug}/`;
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
      { "@type": "Organization", name: "IT Global", url: absolute("/") },
      isService
        ? { "@type": "Service", name: title.replace(/\s*[|]\s*IT Global$/, ""), description, url, provider: { "@type": "Organization", name: "IT Global", url: absolute("/") } }
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
  return list.map((page) => `<a class="solution-link" href="${route(page.slug)}"><h3>${escape(page.navTitle)}</h3><p>${escape(page.description)}</p></a>`).join("\n");
}

/** @param {Item[]} items @returns {string} */
function cards(items) {
  return items.map((item) => `<article class="solution-card"><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></article>`).join("\n");
}

/** @param {Solution} page @returns {string} */
function renderPage(page) {
  const request = `/?request=local-ai&task=${encodeURIComponent(page.requestText)}#services`;
  const breadcrumbs = [{ name: "Главная", path: "/" }];

  if (page.slug !== "local-ai") breadcrumbs.push({ name: "Локальный ИИ", path: route("local-ai") });

  breadcrumbs.push({ name: page.navTitle, path: route(page.slug) });
  const breadcrumbData = origin ? `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumbs.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absolute(item.path) })) }).replaceAll("<", "\\u003c")}</script>` : "";
  const related = pages.filter((item) => item.slug !== page.slug);

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#f0eee7">
<title>${escape(page.title)}</title>
<meta name="description" content="${escape(page.description)}">
${metadata(page.title, page.description, route(page.slug), true)}
${breadcrumbData}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/ys-text-display-wide.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/ys-text-regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/solutions.css">
<link rel="stylesheet" href="/phone.css">
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
<div class="solution-copy"><h1 id="solution-title">${escape(page.heading)}</h1><p>${escape(page.intro)}</p><a class="button primary" href="${escape(request)}">Подобрать модель под задачу</a><span class="solution-hero-note">На вашем сервере. С настройкой и годом поддержки.</span></div>
<div class="solution-demo solution-demo-${escape(page.visual)}" aria-label="Иллюстрация сценария">
<div class="demo-top"><span class="demo-status" aria-hidden="true"></span>На вашем сервере</div>
<div class="demo-symbol" aria-hidden="true">${page.visual === "speech" || page.visual === "transcription" ? '<span class="demo-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>' : '<img src="/assets/logos/ollama.svg" alt="" width="72" height="72">'}</div>
<div class="demo-result"><h2>${escape(page.outputTitle)}</h2><p>${escape(page.outputText)}</p></div><p class="demo-caption">Пример результата</p>
</div>
</section>
</div>
<section class="solution-section container" aria-labelledby="use-cases"><h2 id="use-cases">${escape(page.useCaseHeading)}</h2><div class="solution-cards">${cards(page.useCases)}</div></section>
<section class="solution-section solution-process container" aria-labelledby="process"><h2 id="process">Что сделаем для запуска</h2><div class="solution-cards">${cards(page.process)}</div></section>
<section class="solution-section container" aria-labelledby="requirements"><h2 id="requirements">${escape(page.requirementsHeading)}</h2><div class="solution-cards">${cards(page.requirements)}</div></section>
<section class="solution-offer container" aria-labelledby="offer"><div><h2 id="offer">Разовое внедрение, год поддержки</h2><p>Один сервис за 9 900 ₽ или весь набор за 49 900 ₽. Подберём модель, настроим запуск и передадим доступы вашей команде.</p><p>Оборудование и аренда сервера оплачиваются отдельно. Требования к памяти и видеокарте зависят от модели и нагрузки. Состав работ согласуем до внедрения.</p></div><a class="button primary" href="${escape(request)}">Подготовить заявку</a></section>
<section class="solution-section solution-faq container" aria-labelledby="questions"><h2 id="questions">Вопросы и ответы</h2><div class="faq-list">${page.faq.map((item) => `<details><summary>${escape(item.question)}<span class="faq-plus" aria-hidden="true">+</span></summary><p>${escape(item.answer)}</p></details>`).join("\n")}</div></section>
<section class="solution-section container" aria-labelledby="related"><h2 id="related">Другие задачи для локального ИИ</h2><div class="solution-links">${solutionLinks(related)}</div></section>
</main>
<footer class="solution-footer"><div class="container"><a class="brand" href="/"><span>IT</span><i aria-hidden="true"></i><span>Global</span></a><nav aria-label="Решения">${pages.map((item) => `<a href="${route(item.slug)}">${escape(item.navTitle)}</a>`).join("")}<a href="/#services">Все сервисы</a></nav><p>Подбор и внедрение открытого ПО в вашей инфраструктуре. Лицензии моделей, голоса и необходимые ресурсы проверяем до запуска.</p><p>© 2026 IT Global</p></div></footer>
</body>
</html>
`;
}

for (const page of pages) {
  if (!/^[a-z][a-z-]+$/.test(page.slug)) throw new Error("Некорректный адрес страницы.");

  const directory = path.join(dist, "solutions", page.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), renderPage(page));
}

let home = await readFile(path.join(dist, "index.html"), "utf8");
const seo = `<!-- site-meta:start -->${metadata("IT Global | Ваши сервисы на вашем сервере", "Корпоративная почта, CRM, документы и локальный ИИ на вашем сервере. Подбор открытого ПО, разовое внедрение и год поддержки каждого сервиса.", "/")}<!-- site-meta:end -->`;
home = home.includes("<!-- site-meta:start -->")
  ? home.replace(/<!-- site-meta:start -->[\s\S]*?<!-- site-meta:end -->/, seo)
  : home.replace("</head>", `${seo}</head>`);
const links = `<!-- solution-links:start --><section class="solutions-home container" aria-labelledby="solutions-heading"><h2 id="solutions-heading">Локальный ИИ под ваши задачи</h2><p>Развернём модели для текста, речи и работы с документами в вашей инфраструктуре.</p><div class="solution-links">${solutionLinks(pages)}</div></section><!-- solution-links:end -->`;
home = home.includes("<!-- solution-links:start -->")
  ? home.replace(/<!-- solution-links:start -->[\s\S]*?<!-- solution-links:end -->/, links)
  : home.replace('<section class="consultation"', `${links}\n<section class="consultation"`);
await writeFile(path.join(dist, "index.html"), home);

if (origin) {
  const urls = ["/", ...pages.map((page) => route(page.slug))];
  await writeFile(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escape(absolute(url))}</loc></url>`).join("\n")}\n</urlset>\n`);
} else {
  await rm(path.join(dist, "sitemap.xml"), { force: true });
}

await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\n${origin ? `\nSitemap: ${absolute("/sitemap.xml")}\n` : ""}`);
console.log(`Готово страниц: ${pages.length}. ${origin ? "Карта сайта и canonical обновлены." : "Домен ещё не задан: canonical и sitemap будут добавлены после настройки content/site.json."}`);
