/** @param {string} value @returns {string} */
function escape(value) {
  /** @type {Record<string, string>} */
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

/** @param {import('./services.js').Service} service @param {boolean} isSelected @param {boolean} [tile] @returns {string} */
export function serviceCard(service, isSelected, tile = false) {
  const classes = tile ? "service-card service-tile" : "catalog-card software-card";
  const logo = `<img src="./assets/logos/${service.logo}" width="72" height="72" alt="" loading="lazy"${tile ? ' class="service-logo"' : ""}>`;
  const lastSpace = service.product.lastIndexOf(" ");
  const title = `${escape(service.product.slice(0, lastSpace + 1))}<span class="service-title-ending">${escape(service.product.slice(lastSpace + 1))}<span class="service-title-icon" aria-hidden="true">↗</span></span>`;
  const heading = service.page
    ? `<h3><a class="service-title" href="${escape(service.page)}" aria-label="Подробнее о ${escape(service.product)}">${title}</a></h3>`
    : `<h3><button class="service-title" type="button" data-details="${service.id}" aria-label="Подробнее о ${escape(service.product)}" aria-haspopup="dialog">${title}</button></h3>`;

  return `<article class="${classes}${isSelected ? " selected" : ""}" data-service="${service.id}">
    ${tile ? heading : `<div class="software-card-title">${logo}${heading}</div>`}
    <p>${escape(service.description)}</p>
    ${tile ? logo : `<p class="software-replaces">Возможная замена: ${service.replaces.map(escape).join(", ")}</p>`}
    <div class="software-card-actions"><button class="button" type="button" data-toggle-service="${service.id}" aria-pressed="${isSelected}" aria-label="${isSelected ? "Убрать" : "Добавить"} ${escape(service.product)} ${isSelected ? "из заявки" : "в заявку"}">${isSelected ? "✓ Добавлено" : "+ Добавить"}</button></div>
  </article>`;
}
