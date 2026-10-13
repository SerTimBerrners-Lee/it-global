import { services } from "./services.js";
import { initializeCalculator } from "./calculator-ui.js";
import { initializeHero } from "./hero.js";
import { initializeRequestForm } from "./request-form.js";
import { serviceCard } from "./catalog.js";

/** @type {(selector: string) => Element | null} */
const $ = (selector) => document.querySelector(selector);

/** @type {(selector: string) => Element[]} */
const $$ = (selector) => [...document.querySelectorAll(selector)];

const selected = restoreSelection();

/** @type {import('./services.js').Service | undefined} */
let activeService;

let category = "all";

let pageCategory = "all";

let search = "";

/** @type {Element | null | undefined} */
let previousOpener;

/** @param {string} id @param {Element} [opener] @returns {void} */
function openDialog(id, opener) {
  if (!$("dialog[open]")) previousOpener = opener || document.activeElement;

  $$("dialog[open]").forEach((dialog) => dialog.close());
  closeMenu();
  $(id).showModal();
}

/** @returns {void} */
function closeMenu() {
  $("#mobile-nav").hidden = true;
  $(".menu-toggle").setAttribute("aria-expanded", "false");
  $(".menu-toggle").setAttribute("aria-label", "Открыть меню");
}

/** @returns {Set<string>} */
function restoreSelection() {
  try {
    /** @type {unknown} */
    const saved = JSON.parse(
      localStorage.getItem("it-global-services") || "[]",
    );
    const validIds = new Set(services.map((service) => service.id));

    if (Array.isArray(saved)) {
      return new Set(
        saved.filter((id) => typeof id === "string" && validIds.has(id)),
      );
    }
  } catch {
    // The catalogue also works when browser storage is unavailable.
  }

  return new Set();
}

/** @returns {void} */
function renderCatalog() {
  const openerGrid = previousOpener?.closest(
    "#software-grid, #catalog-grid",
  )?.id;
  const openerService =
    previousOpener instanceof HTMLElement
      ? previousOpener.dataset.details || previousOpener.dataset.toggleService
      : undefined;
  const openerAttribute = previousOpener?.hasAttribute("data-details")
    ? "data-details"
    : "data-toggle-service";

  const matching = services.filter((service) => {
    const matchesCategory =
      pageCategory === "all" || service.category === pageCategory;
    const text = [
      service.product,
      service.title,
      service.description,
      ...service.replaces,
    ]
      .join(" ")
      .toLocaleLowerCase("ru-RU");

    return matchesCategory && text.includes(search);
  });

  $("#software-grid").innerHTML = matching
    .map((service) => serviceCard(service, selected.has(service.id), true))
    .join("");
  $("#catalog-result-count").textContent =
    "Найдено сервисов: " + matching.length + " из " + services.length;
  $("#catalog-empty").hidden = matching.length > 0;
  $("#catalog-grid").innerHTML = services
    .filter((service) => category === "all" || service.category === category)
    .map((service) => serviceCard(service, selected.has(service.id)))
    .join("");

  if (openerGrid && openerService) {
    previousOpener = $$("#" + openerGrid + " [" + openerAttribute + "]").find(
      (item) => item.getAttribute(openerAttribute) === openerService,
    );
  }
}

/** @returns {void} */
function syncSelections() {
  $$("#request-options input").forEach((input) => {
    input.checked = selected.has(input.value);
  });

  $("#selection-dock").hidden = selected.size === 0;
  $("#selection-title").textContent = "Ваш набор сервисов";
  $("#selection-products").textContent = services
    .filter((service) => selected.has(service.id))
    .map((service) => service.product)
    .join(" · ");

  if (activeService) {
    $("#select-service").textContent = selected.has(activeService.id)
      ? "Убрать из заявки"
      : "Добавить в заявку";
  }

  try {
    localStorage.setItem("it-global-services", JSON.stringify([...selected]));
  } catch {
    // Selection remains available for the current page session.
  }

  renderCatalog();
}

/** @param {string} id @returns {void} */
function toggleService(id) {
  const service = services.find((item) => item.id === id);

  if (!service) return;

  if (selected.has(id)) selected.delete(id);
  else selected.add(id);

  syncSelections();
  $("#selection-status").textContent =
    service.product +
    (selected.has(id) ? " добавлен в заявку." : " убран из заявки.") +
    " Выбрано: " +
    selected.size;
}

/** @param {string} id @param {HTMLElement} opener @returns {void} */
function showService(id, opener) {
  const s = services.find((item) => item.id === id);
  if (!s) return;
  activeService = s;
  $("#service-dialog-title").textContent = s.title;
  $("#service-dialog-product").textContent = s.product;
  $("#service-dialog-detail").textContent = s.detail;
  $("#service-dialog-replaces").textContent =
    "Возможная замена: " + s.replaces.join(", ");
  $("#service-dialog-limitation").textContent = s.limitation;
  $("#service-dialog-link").href = s.url;
  $("#select-service").textContent = selected.has(id)
    ? "Убрать из заявки"
    : "Добавить в заявку";
  openDialog("#service-dialog", opener);
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const button = event.target.closest("button");

  if (!button) return;

  if (button.hasAttribute("data-close")) button.closest("dialog").close();
  if (button.hasAttribute("data-details"))
    showService(button.dataset.details, button);
  if (button.hasAttribute("data-request") || button.hasAttribute("data-plan")) {
    $("#form-status").textContent = "";
    openDialog("#request-dialog", button);
  }

  if (button.hasAttribute("data-catalog"))
    openDialog("#catalog-dialog", button);
  if (button.hasAttribute("data-journey"))
    openDialog("#journey-dialog", button);
  if (button.hasAttribute("data-calculator"))
    openDialog("#calculator-dialog", button);

  if (button.hasAttribute("data-toggle-service")) {
    const id = button.dataset.toggleService;
    const gridId = button.closest("#software-grid, #catalog-grid")?.id;

    toggleService(id);

    if (gridId) {
      $$("#" + gridId + " [data-toggle-service]")
        .find((item) => item.dataset.toggleService === id)
        ?.focus({ preventScroll: true });
    }
  }

  if (button.hasAttribute("data-clear")) {
    selected.clear();
    syncSelections();
    $("#selection-status").textContent = "Ваш набор очищен.";
    $("#catalog-search").focus({ preventScroll: true });
  }

  if (
    button.hasAttribute("data-page-filter") ||
    button.hasAttribute("data-filter")
  ) {
    const isPage = button.hasAttribute("data-page-filter");
    const selector = isPage ? "[data-page-filter]" : "[data-filter]";

    if (isPage) pageCategory = button.dataset.pageFilter;
    else category = button.dataset.filter;

    $$(selector).forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });

    renderCatalog();
  }
});

$("#catalog-search").addEventListener("input", (event) => {
  search = event.target.value.trim().toLocaleLowerCase("ru-RU");
  renderCatalog();
});

$("#select-service").addEventListener("click", () => {
  if (activeService) toggleService(activeService.id);
});

services.forEach((service) => {
  const label = document.createElement("label");
  const input = document.createElement("input");
  const name = document.createElement("span");

  label.className = "service-choice";
  input.type = "checkbox";
  input.name = "services";
  input.value = service.id;
  name.textContent = service.product;
  label.append(input, name);
  $("#request-options").append(label);
});

$("#request-options").addEventListener("change", (event) => {
  if (event.target instanceof HTMLInputElement) toggleService(event.target.value);
});

$(".menu-toggle").addEventListener("click", () => {
  const open = $(".menu-toggle").getAttribute("aria-expanded") !== "true";
  $(".menu-toggle").setAttribute("aria-expanded", String(open));
  $(".menu-toggle").setAttribute(
    "aria-label",
    open ? "Закрыть меню" : "Открыть меню",
  );
  $("#mobile-nav").hidden = !open;
});

$("#mobile-nav").addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});
window.matchMedia("(min-width: 1281px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});
$$("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  });
  dialog.addEventListener("close", () => {
    requestAnimationFrame(() => {
      if (
        !$("dialog[open]") &&
        previousOpener?.isConnected &&
        !previousOpener.closest("dialog")
      )
        previousOpener.focus({ preventScroll: true });
    });
  });
});

const calculator = initializeCalculator();

initializeHero();

initializeRequestForm(() => [...selected], () => calculator.getCalculation());

syncSelections();

// A solution page can pass its task to the existing request form.
const requestParams = new URLSearchParams(location.search);
const requestedService = services.find((service) => service.id === requestParams.get("request"));

if (requestedService) {
  selected.add(requestedService.id);
  syncSelections();

  const message = $("#request-form [name=message]");

  if (!message.value) message.value = (requestParams.get("task") || "").slice(0, 3000);

  openDialog("#request-dialog");
  requestParams.delete("request");
  requestParams.delete("task");

  const remainingQuery = requestParams.toString();

  history.replaceState(null, "", location.pathname + (remainingQuery ? "?" + remainingQuery : "") + location.hash);
}
