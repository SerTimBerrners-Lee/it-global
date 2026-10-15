import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = (await readFile(new URL("../dist/analytics.js", import.meta.url), "utf8"))
  .replace(/^import \{ metrikaId \} from "\.\/analytics-config\.js";\s*/m, "")
  .replace("export function trackGoal", "function trackGoal");

/**
 * @param {number | null} counterId
 * @param {Record<string, unknown>} globals
 * @returns {vm.Context}
 */
function runAnalytics(counterId, globals) {
  const context = vm.createContext({ metrikaId: counterId, URL, ...globals });

  vm.runInContext(source, context, { timeout: 1000, filename: "analytics.js" });

  return context;
}

/** @returns {{context: vm.Context, scripts: Record<string, unknown>[], listeners: Map<string, (event: {target: unknown}) => void>}} */
function enabledFixture() {
  /** @type {Record<string, unknown>[]} */
  const scripts = [];
  /** @type {Map<string, (event: {target: unknown}) => void>} */
  const listeners = new Map();

  class TestElement {
    /** @param {string} selector @returns {TestElement | null} */
    closest(selector) {
      return selector === 'a[href^="tel:"]' ? this : null;
    }
  }

  const context = runAnalytics(123456, {
    window: {},
    Element: TestElement,
    location: { origin: "https://its-global.ru", pathname: "/services/mailu/", search: "?phone=secret", hash: "#private" },
    document: {
      title: "Корпоративная почта | IT Global",
      referrer: "https://example.org/private/contact?email=secret@example.org#name",
      /** @param {string} tag @returns {Record<string, unknown>} */
      createElement(tag) {
        assert.equal(tag, "script");

        return {};
      },
      head: {
        /** @param {Record<string, unknown>} script @returns {void} */
        append(script) {
          scripts.push(script);
        },
      },
      /** @param {string} event @param {(event: {target: unknown}) => void} listener @returns {void} */
      addEventListener(event, listener) {
        listeners.set(event, listener);
      },
    },
    /** @returns {never} */
    fetch() {
      throw new Error("Analytics tests must not contact a real network");
    },
  });

  return { context, scripts, listeners };
}

/** @param {vm.Context} context @returns {unknown[][]} */
function queuedCalls(context) {
  return JSON.parse(vm.runInContext("JSON.stringify(window.ym.a)", context));
}

test("an unconfigured counter makes no DOM or network calls, including goal calls", () => {
  const forbidden = new Proxy({}, {
    /** @returns {never} */
    get() {
      throw new Error("Disabled analytics must not access DOM or network");
    },
  });
  const context = runAnalytics(null, { window: {}, document: forbidden, location: forbidden });

  vm.runInContext('trackGoal("phone_click"); trackGoal("request_open"); trackGoal("request_sent");', context);
  assert.equal(vm.runInContext("window.ym", context), undefined);
});

test("enabled analytics prepares one script and omits query, fragment and referrer path from its hit", () => {
  const { context, scripts, listeners } = enabledFixture();

  assert.deepEqual(scripts, [{ async: true, src: "https://mc.yandex.ru/metrika/tag.js" }]);
  assert.equal(listeners.size, 1);
  assert.deepEqual(queuedCalls(context), [
    [123456, "init", { defer: true, clickmap: false, trackLinks: false, webvisor: false, disableYtm: true }],
    [123456, "hit", "https://its-global.ru/services/mailu/", { title: "Корпоративная почта | IT Global", referer: "https://example.org" }],
  ]);
});

test("only the three declared goals reach the queue without form payloads", () => {
  const { context } = enabledFixture();

  vm.runInContext(`
    trackGoal("request_open", {name: "Private name", phone: "+70000000000"});
    trackGoal("request_sent", {message: "Private request"});
    trackGoal("phone_click");
    trackGoal("unknown_goal");
    trackGoal("secret@example.org");
  `, context);

  assert.deepEqual(queuedCalls(context).slice(2), [
    [123456, "reachGoal", "request_open"],
    [123456, "reachGoal", "request_sent"],
    [123456, "reachGoal", "phone_click"],
  ]);
});

test("telephone clicks count a goal while unrelated targets do not", () => {
  const { context, listeners } = enabledFixture();
  const click = listeners.get("click");

  assert.ok(click);
  click({ target: {} });
  assert.equal(queuedCalls(context).length, 2);
  click({ target: vm.runInContext("new Element()", context) });
  assert.deepEqual(queuedCalls(context).slice(2), [[123456, "reachGoal", "phone_click"]]);
});
