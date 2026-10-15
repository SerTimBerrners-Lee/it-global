import { metrikaId } from "./analytics-config.js";

/** @typedef {((...args: unknown[]) => void) & {a?: unknown[][], l?: number}} Metrika */
/** @type {Window & {ym?: Metrika}} */
const browserWindow = window;
const goals = new Set(["phone_click", "request_open", "request_sent"]);
const enabled = Number.isSafeInteger(metrikaId) && metrikaId > 0;

/** @param {string} name @returns {void} */
export function trackGoal(name) {
  if (!enabled || !goals.has(name)) return;

  browserWindow.ym?.(metrikaId, "reachGoal", name);
}

/** @returns {void} */
function initializeAnalytics() {
  if (!enabled) return;

  if (!browserWindow.ym) {
    /** @type {Metrika} */
    const queue = (...args) => {
      (queue.a ||= []).push(args);
    };

    queue.l = Date.now();
    browserWindow.ym = queue;

    const script = document.createElement("script");

    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    document.head.append(script);
  }

  // Enable only after the owner supplies their counter ID. Form fields are not sent.
  browserWindow.ym(metrikaId, "init", {
    defer: true,
    clickmap: false,
    trackLinks: false,
    webvisor: false,
    disableYtm: true,
  });
  browserWindow.ym(metrikaId, "hit", location.origin + location.pathname, {
    title: document.title,
    referer: document.referrer ? new URL(document.referrer).origin : "",
  });

  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest('a[href^="tel:"]')) {
      trackGoal("phone_click");
    }
  });
}

initializeAnalytics();
