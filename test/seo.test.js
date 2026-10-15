import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { services } from "../dist/services.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const site = JSON.parse(await readFile(path.join(root, "content/site.json"), "utf8"));
const aiPages = JSON.parse(await readFile(path.join(root, "content/solutions.json"), "utf8"));
const servicePages = JSON.parse(await readFile(path.join(root, "content/services-pages.json"), "utf8"));
const routes = ["/", ...aiPages.map((page) => `/solutions/${page.slug}/`), ...servicePages.map((page) => `/services/${page.slug}/`)];
const pages = new Map(await Promise.all(routes.map(async (route) => [route, await readFile(path.join(dist, route, "index.html"), "utf8")])));

/** @param {string} value @returns {string} */
function decode(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#39);/g, (entity) => ({ "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">", "&#39;": "'" })[entity]);
}

/** @param {string} html @param {string} tag @returns {Record<string, string>[]} */
function attributes(html, tag) {
  return [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, "gi"))].map((match) => Object.fromEntries(
    [...match[1].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((attribute) => [attribute[1].toLowerCase(), decode(attribute[2])]),
  ));
}

test("the delivered homepage contains every catalog product before JavaScript runs", () => {
  const html = pages.get("/");
  const cards = attributes(html, "article").filter((item) => item["data-service"]);

  assert.equal(cards.length, 17);
  assert.deepEqual(cards.map((card) => card["data-service"]).sort(), services.map((service) => service.id).sort());

  const links = attributes(html, "a").map((link) => link.href);

  for (const service of services.filter((item) => item.page)) {
    assert.ok(links.includes(service.page), `${service.product} needs a crawlable page link`);
  }

  assert.ok(links.includes("/services/cloud-migration/"));
});

test("the sitemap contains the homepage and all twenty-one generated destination pages", async () => {
  const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decode(match[1]));
  const expected = routes.map((route) => new URL(route, site.url).href);

  assert.equal(routes.length, 22);
  assert.equal(new Set(urls).size, urls.length);
  assert.deepEqual(urls.sort(), expected.sort());
  assert.match(await readFile(path.join(dist, "robots.txt"), "utf8"), new RegExp(`Sitemap: ${site.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sitemap\\.xml`));
});

test("every indexable page has unique metadata, one heading and its canonical address", () => {
  const titles = new Set();
  const descriptions = new Set();

  for (const [route, html] of pages) {
    const pageUrl = new URL(route, site.url).href;
    const titleTags = [...html.matchAll(/<title>(.*?)<\/title>/gs)];
    const meta = attributes(html, "meta");
    const description = meta.filter((item) => item.name === "description");
    const canonical = attributes(html, "link").filter((item) => item.rel === "canonical");

    assert.equal(titleTags.length, 1, route);
    assert.equal(description.length, 1, route);
    assert.ok(description[0].content.trim().length > 40, route);
    assert.equal(canonical.length, 1, route);
    assert.equal(canonical[0].href, pageUrl, route);
    assert.equal(meta.find((item) => item.property === "og:url")?.content, pageUrl, route);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, route);
    assert.equal(meta.some((item) => item.name === "robots" && /noindex/i.test(item.content)), false, route);
    assert.equal(titles.has(titleTags[0][1]), false, `Duplicate title at ${route}`);
    assert.equal(descriptions.has(description[0].content), false, `Duplicate description at ${route}`);

    titles.add(titleTags[0][1]);
    descriptions.add(description[0].content);

    for (const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
      assert.doesNotThrow(() => JSON.parse(match[1]), `Invalid structured data at ${route}`);
    }
  }
});

test("local page links, fragments and image variants resolve to published files", async () => {
  for (const [route, html] of pages) {
    const references = attributes(html, "(?:a|link|script|img|source)").flatMap((item) => [
      item.href,
      item.src,
      ...(item.srcset ? item.srcset.split(",").map((candidate) => candidate.trim().split(/\s+/)[0]) : []),
    ]).filter(Boolean);

    for (const reference of references) {
      const url = new URL(reference, new URL(route, site.url));

      if (url.origin !== site.url) continue;

      const relativeFile = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      const file = path.join(dist, relativeFile, url.pathname.endsWith("/") ? "index.html" : "");

      assert.ok((await stat(file)).isFile(), `${route}: missing ${reference}`);

      if (url.hash && file.endsWith(".html")) {
        const target = await readFile(file, "utf8");
        const ids = attributes(target, "[a-z][a-z0-9-]*").map((item) => item.id);

        assert.ok(ids.includes(decodeURIComponent(url.hash.slice(1))), `${route}: missing fragment ${reference}`);
      }
    }
  }
});
