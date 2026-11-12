import { infrastructureServices } from "./catalog.js";
import { initializeRequestForm } from "../ai/request-form.js";
import { trackGoal } from "../analytics.js";

/** @param {string} selector @returns {HTMLElement} */
function element(selector) {
  const target = document.querySelector(selector);

  if (!(target instanceof HTMLElement)) throw new Error("Не найден элемент: " + selector);

  return target;
}

const dialog = element("#request-dialog");
const menu = element("#mobile-nav");
const toggle = element(".menu-toggle");
/** @type {HTMLElement | null} */
let opener = null;

/** @returns {void} */
function closeMenu() {
  menu.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Открыть меню");
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element) || !(dialog instanceof HTMLDialogElement)) return;

  const button = event.target.closest("button[data-request]");

  if (button instanceof HTMLElement) {
    opener = button;
    const serviceId = button.dataset.service;

    if (serviceId && infrastructureServices.some((service) => service.id === serviceId)) {
      const checkbox = document.querySelector('#request-options input[value="' + serviceId + '"]');

      if (checkbox instanceof HTMLInputElement) checkbox.checked = true;
    }

    element("#form-status").textContent = "";
    closeMenu();
    dialog.showModal();
    trackGoal("request_open");
  }

  if (event.target.closest("[data-close]")) dialog.close();
});

dialog.addEventListener("click", (event) => {
  if (event.target !== dialog || !(dialog instanceof HTMLDialogElement)) return;

  const bounds = dialog.getBoundingClientRect();

  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});

dialog.addEventListener("close", () => { opener?.focus({ preventScroll: true }); });

toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";

  menu.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
});

menu.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("a")) closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

window.matchMedia("(min-width: 1281px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

initializeRequestForm(() => [...document.querySelectorAll('#request-options input:checked')]
  .filter((input) => input instanceof HTMLInputElement)
  .map((input) => input.value), "infrastructure");
