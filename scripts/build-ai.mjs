import { readFile, writeFile } from "node:fs/promises";
import { aiServices } from "../dist/ai/catalog.js";

/** @param {string} value @returns {string} */
function escape(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

const location = new URL("../dist/ai/index.html", import.meta.url);
const html = await readFile(location, "utf8");
const cards = aiServices.map((service) => `<article class="ai-service-card" data-service="${escape(service.id)}" data-category="${escape(service.category)}">
  <h3>${escape(service.title)}</h3>
  <p>${escape(service.description)}</p>
  <p class="ai-service-result">${escape(service.result)}</p>
  <button class="button" type="button" data-select="${escape(service.id)}" aria-pressed="false">+ Включить в заявку</button>
  <span class="ai-service-symbol" aria-hidden="true">${escape(service.symbol)}</span>
</article>`).join("\n");

await writeFile(location, html.replace(
  /<!-- ai-catalog:start -->[\s\S]*?<!-- ai-catalog:end -->/,
  `<!-- ai-catalog:start --><div class="ai-service-grid" id="ai-services">${cards}</div><!-- ai-catalog:end -->`,
));
