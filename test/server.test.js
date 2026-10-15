import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rmdir, stat, unlink, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../server/server.js";

const origin = "https://its-global.ru";

/** @returns {import('../server/request.js').RequestData} */
function validRequest() {
  return {
    name: "Проверка формы",
    phone: "+7 (999) 123-45-67",
    message: "Перенести почту и настроить ИИ.",
    serviceIds: ["mail", "local-ai"],
    calculation: { current: 10000, plan: "bundle", needsVds: true },
  };
}

/**
 * @param {import('node:test').TestContext} context
 * @param {Partial<Parameters<typeof createApp>[0]>} [options]
 * @returns {Promise<{port: number, messages: import('../server/mail.js').MailMessage[]}>}
 */
async function fixture(context, options = {}) {
  /** @type {import('../server/mail.js').MailMessage[]} */
  const messages = [];
  const server = createApp({
    allowedOrigins: [origin],
    rateLimit: 50,
    sender: {
      ready: true,
      /** @param {import('../server/mail.js').MailMessage} message @returns {Promise<void>} */
      async send(message) {
        messages.push(message);
      },
    },
    ...options,
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  context.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  const address = server.address();

  assert.ok(address && typeof address === "object");

  return { port: address.port, messages };
}

/**
 * @typedef {{status: number, headers: http.IncomingHttpHeaders, text: string}} HttpResult
 */

/**
 * @param {number} port
 * @param {{path?: string, method?: string, headers?: http.OutgoingHttpHeaders, body?: string, chunks?: string[]}} [options]
 * @returns {Promise<HttpResult>}
 */
function exchange(port, { path = "/", method = "GET", headers = {}, body, chunks } = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: "127.0.0.1",
      port,
      path,
      method,
      headers: { Connection: "close", ...headers },
      timeout: 5000,
    }, (response) => {
      const received = [];

      response.on("data", (chunk) => received.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode || 0,
        headers: response.headers,
        text: Buffer.concat(received).toString("utf8"),
      }));
      response.on("error", reject);
    });

    request.on("error", reject);
    request.on("timeout", () => request.destroy(new Error("Local HTTP test timed out")));

    if (chunks) {
      for (const chunk of chunks) request.write(chunk);
      request.end();
    } else {
      request.end(body);
    }
  });
}

/**
 * @param {number} port
 * @param {unknown} [payload]
 * @param {http.OutgoingHttpHeaders} [headers]
 * @returns {Promise<HttpResult>}
 */
function post(port, payload = validRequest(), headers = {}) {
  return exchange(port, {
    path: "/api/requests",
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

test("serves public pages with correct HTML and response headers", async (context) => {
  const app = await fixture(context);

  for (const pathname of ["/", "/solutions/local-ai/", "/solutions/transcription/", "/solutions/speech-synthesis/", "/solutions/document-assistant/"]) {
    const response = await exchange(app.port, { path: pathname });

    assert.equal(response.status, 200, pathname);
    assert.equal(response.headers["content-type"], "text/html; charset=utf-8");
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(response.headers["referrer-policy"], "strict-origin-when-cross-origin");
    assert.equal(response.headers["cache-control"], "no-cache");
    assert.equal(Number(response.headers["content-length"]), Buffer.byteLength(response.text));
    assert.match(response.text, /<html lang="ru">/);
    assert.match(response.text, /its-global\.ru/);
  }

  assert.equal(app.messages.length, 0);
});

test("HEAD has no body, directory redirects preserve queries and unsupported methods fail", async (context) => {
  const { port } = await fixture(context);
  const get = await exchange(port, { path: "/solutions/local-ai/" });
  const head = await exchange(port, { path: "/solutions/local-ai/", method: "HEAD" });
  const redirect = await exchange(port, { path: "/solutions/local-ai?from=search" });
  const staticPost = await exchange(port, { method: "POST" });
  const apiGet = await exchange(port, { path: "/api/requests" });

  assert.equal(head.status, 200);
  assert.equal(head.text, "");
  assert.equal(head.headers["content-length"], get.headers["content-length"]);
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.location, "/solutions/local-ai/?from=search");
  assert.equal(redirect.text, "");
  assert.equal(staticPost.status, 405);
  assert.equal(staticPost.headers.allow, "GET, HEAD");
  assert.equal(apiGet.status, 405);
  assert.equal(apiGet.headers.allow, "POST");
  assert.equal(apiGet.headers["cache-control"], "no-store");
  assert.equal(apiGet.headers.etag, undefined);
});

test("redirects only existing index pages to local canonical URLs and preserves queries", async (context) => {
  const { port } = await fixture(context);

  for (const [requested, canonical] of [
    ["/index.html?from=search&term=a%20b", "/?from=search&term=a%20b"],
    ["/solutions/local-ai/index.html?source=mail", "/solutions/local-ai/?source=mail"],
    ["/solutions/local-ai/%69ndex.html", "/solutions/local-ai/"],
    ["/%2fsolutions/local-ai/index.html", "/solutions/local-ai/"],
  ]) {
    const response = await exchange(port, { path: requested });

    assert.equal(response.status, 301, requested);
    assert.equal(response.headers.location, canonical);
    assert.equal(response.text, "");
    assert.equal(response.headers["cache-control"], "no-cache");
  }

  for (const pathname of ["/missing/index.html", "/assets/index.html", "/assets"]) {
    const response = await exchange(port, { path: pathname });

    assert.equal(response.status, 404, pathname);
    assert.equal(response.headers.location, undefined);
  }
});

test("caches images and fonts while HTML, scripts, styles and crawler files revalidate", async (context) => {
  const { port } = await fixture(context);

  for (const [pathname, expected] of [
    ["/", "no-cache"],
    ["/styles.css", "public, max-age=0, must-revalidate"],
    ["/app.js", "public, max-age=0, must-revalidate"],
    ["/favicon.svg", "public, max-age=86400"],
    ["/assets/security/backup.png", "public, max-age=86400"],
    ["/assets/fonts/ys-text-regular.woff2", "public, max-age=86400"],
    ["/robots.txt", "no-cache"],
    ["/sitemap.xml", "no-cache"],
  ]) {
    const response = await exchange(port, { path: pathname, method: "HEAD" });
    const cached = await exchange(port, { path: pathname, headers: { "If-None-Match": response.headers.etag } });

    assert.equal(response.status, 200, pathname);
    assert.equal(response.headers["cache-control"], expected, pathname);
    assert.ok(response.headers.etag, pathname);
    assert.equal(response.text, "");
    assert.equal(cached.status, 304, pathname);
    assert.equal(cached.headers.etag, response.headers.etag);
    assert.equal(cached.headers["cache-control"], expected);
    assert.equal(cached.headers["content-length"], undefined);
    assert.equal(cached.text, "");
  }
});

test("ETag revalidation handles weak comparison and detects same-size same-time changes", async (context) => {
  const directory = await mkdtemp(fileURLToPath(new URL("../dist/http-test-", import.meta.url)));
  const filename = path.join(directory, "style.css");
  const pathname = "/" + path.basename(directory) + "/style.css";

  await writeFile(filename, "body{color:red}");
  context.after(async () => {
    await unlink(filename);
    await rmdir(directory);
  });

  const originalInfo = await stat(filename);
  const { port } = await fixture(context);
  const original = await exchange(port, { path: pathname });
  const etag = original.headers.etag;

  assert.ok(etag);

  for (const condition of [etag, etag.replace(/^W\//, ""), '"old", ' + etag, "*"]) {
    for (const method of ["GET", "HEAD"]) {
      const cached = await exchange(port, { path: pathname, method, headers: { "If-None-Match": condition } });

      assert.equal(cached.status, 304);
      assert.equal(cached.text, "");
    }
  }

  const unmatched = await exchange(port, { path: pathname, headers: { "If-None-Match": 'W/"old"' } });
  const missing = await exchange(port, { path: pathname + ".missing", headers: { "If-None-Match": "*" } });

  assert.equal(unmatched.status, 200);
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.etag, undefined);

  await writeFile(filename, "body{color:tan}");
  await utimes(filename, originalInfo.atime, originalInfo.mtime);

  const updated = await exchange(port, { path: pathname, headers: { "If-None-Match": etag } });

  assert.equal(updated.status, 200);
  assert.equal(updated.text, "body{color:tan}");
  assert.notEqual(updated.headers.etag, etag);
  assert.equal(updated.headers["content-length"], original.headers["content-length"]);
});

test("accepts the API request and sends only the server-generated message", async (context) => {
  const app = await fixture(context);
  const response = await post(app.port, {
    ...validRequest(),
    recipient: "injected@example.test",
    subject: "Injected subject",
    calculation: { ...validRequest().calculation, setup: 1, firstYearSavings: 999999999 },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.text), { ok: true });
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
  assert.equal(app.messages.length, 1);
  assert.equal(app.messages[0].subject, "Новая заявка с its-global.ru");
  assert.match(app.messages[0].text, /Имя: Проверка формы/);
  assert.match(app.messages[0].text, /Телефон: \+7 \(999\) 123-45-67/);
  assert.match(app.messages[0].text, /Корпоративная почта \(Mailu\)/);
  assert.match(app.messages[0].text, /Локальные ИИ-модели \(Локальный ИИ\)/);
  assert.match(app.messages[0].text, /Экономия за первый год: 34 100 ₽/);
  assert.match(app.messages[0].text, /12 месяцев с запуска каждого установленного сервиса/);
  assert.match(app.messages[0].text, /Для локального ИИ отдельно рассчитываются ресурсы/);
  assert.doesNotMatch(app.messages[0].text, /injected|Injected|999999999/);
});

test("unconfigured delivery returns 503 without attempting to send", async (context) => {
  let attempts = 0;
  const app = await fixture(context, {
    sender: {
      ready: false,
      /** @returns {Promise<void>} */
      async send() { attempts += 1; },
    },
  });
  const response = await post(app.port);

  assert.equal(response.status, 503);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers.etag, undefined);
  assert.equal(attempts, 0);
  assert.equal(JSON.parse(response.text).ok, undefined);
  assert.match(JSON.parse(response.text).error, /временно недоступна/);
});

test("SMTP failures and unexpected internal failures do not leak private details", async (context) => {
  const smtpFailure = await fixture(context, {
    sender: {
      ready: true,
      /** @returns {Promise<void>} */
      async send() { throw new Error("AUTH private-password at secret.example.test"); },
    },
  });
  const internalFailure = await fixture(context, {
    sender: {
      /** @returns {boolean} */
      get ready() { throw new Error("private-password at secret.example.test"); },
      /** @returns {Promise<void>} */
      async send() { assert.fail("An internal failure must prevent delivery"); },
    },
  });

  for (const [app, expectedStatus] of [[smtpFailure, 502], [internalFailure, 500]]) {
    const response = await post(app.port);

    assert.equal(response.status, expectedStatus);
    assert.equal(JSON.parse(response.text).ok, undefined);
    assert.doesNotMatch(response.text, /AUTH|private-password|secret\.example|Error:|server\.js/);
  }
});

test("rejects foreign, forged and cross-site origins before invoking delivery", async (context) => {
  const app = await fixture(context);

  for (const headers of [
    { Origin: "https://attacker.example" },
    { Origin: "https://its-global.ru.attacker.example" },
    { Origin: "null" },
    { Origin: origin + "/" },
    { Origin: origin, "Sec-Fetch-Site": "cross-site" },
    { Origin: undefined, "Sec-Fetch-Site": "cross-site" },
  ]) {
    const filteredHeaders = Object.fromEntries(Object.entries(headers).filter(([, value]) => value !== undefined));
    const response = await exchange(app.port, {
      path: "/api/requests",
      method: "POST",
      headers: { "Content-Type": "application/json", ...filteredHeaders },
      body: JSON.stringify(validRequest()),
    });

    assert.equal(response.status, 403);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(response.headers.etag, undefined);
  }

  assert.equal(app.messages.length, 0);
});

test("requires JSON content type and rejects malformed JSON and invalid request values", async (context) => {
  const app = await fixture(context);

  for (const contentType of [undefined, "text/plain", "application/x-www-form-urlencoded", "application/json-patch+json"]) {
    const response = await exchange(app.port, {
      path: "/api/requests",
      method: "POST",
      headers: { Origin: origin, ...(contentType ? { "Content-Type": contentType } : {}) },
      body: JSON.stringify(validRequest()),
    });

    assert.equal(response.status, 415);
  }

  for (const body of ["{", "", "null", JSON.stringify({ ...validRequest(), phone: "invalid" }), JSON.stringify({ ...validRequest(), serviceIds: ["invented"] })]) {
    const response = await exchange(app.port, {
      path: "/api/requests",
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json; charset=utf-8" },
      body,
    });

    assert.equal(response.status, 400);
  }

  assert.equal(app.messages.length, 0);
});

test("enforces the byte limit for declared lengths and chunked bodies", async (context) => {
  const app = await fixture(context);
  const body = JSON.stringify({ ...validRequest(), ignored: "я".repeat(9000) });
  const declared = await exchange(app.port, {
    path: "/api/requests",
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    body,
  });
  const chunked = await exchange(app.port, {
    path: "/api/requests",
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", "Transfer-Encoding": "chunked" },
    chunks: [body.slice(0, 3000), body.slice(3000, 6000), body.slice(6000)],
  });

  assert.equal(declared.status, 413);
  assert.equal(chunked.status, 413);
  assert.equal(app.messages.length, 0);
});

test("rate limiting counts invalid submissions and ignores spoofed proxy headers by default", async (context) => {
  const app = await fixture(context, { rateLimit: 2 });
  const first = await post(app.port, { ...validRequest(), name: "" }, { "X-Forwarded-For": "192.0.2.1" });
  const second = await post(app.port, validRequest(), { "X-Forwarded-For": "192.0.2.2" });
  const third = await post(app.port, validRequest(), { "X-Forwarded-For": "192.0.2.3", "X-Real-IP": "192.0.2.4" });

  assert.equal(first.status, 400);
  assert.equal(second.status, 200);
  assert.equal(third.status, 429);
  assert.ok(Number(third.headers["retry-after"]) >= 1);
  assert.equal(app.messages.length, 1);
});

test("trusted loopback proxy uses one validated IP and rejects forwarded chains as identities", async (context) => {
  const app = await fixture(context, { rateLimit: 1, trustProxy: true });
  const first = await post(app.port, validRequest(), { "X-Forwarded-For": "192.0.2.10" });
  const repeated = await post(app.port, validRequest(), { "X-Forwarded-For": "192.0.2.10" });
  const another = await post(app.port, validRequest(), { "X-Forwarded-For": "192.0.2.11" });
  const chain = await post(app.port, validRequest(), { "X-Forwarded-For": "198.51.100.1, 192.0.2.10" });
  const otherChain = await post(app.port, validRequest(), { "X-Forwarded-For": "198.51.100.2, 192.0.2.11" });
  const invalid = await post(app.port, validRequest(), { "X-Forwarded-For": "not-an-ip" });

  assert.equal(first.status, 200);
  assert.equal(repeated.status, 429);
  assert.equal(another.status, 200);
  assert.equal(chain.status, 200);
  assert.equal(otherChain.status, 429);
  assert.equal(invalid.status, 429);
  assert.equal(app.messages.length, 3);
});

test("never serves project secrets, source outside dist or encoded traversal paths", async (context) => {
  const app = await fixture(context);
  const hiddenPaths = [
    "/.env", "/.env.example", "/.git/config", "/package.json", "/server/server.js", "/README.md",
    "/../server/server.js", "/%2e%2e/server/server.js", "/%2e%2e%2fserver/server.js",
    "/assets/%2e%2e%2f%2e%2e%2f.env", "/%2eenv", "/%5c..%5c.env", "/index.html%00",
    "/C:%5cUsers%5cDavid%5c.env", "/index.html:stream",
  ];

  for (const pathname of hiddenPaths) {
    const response = await exchange(app.port, { path: pathname });

    assert.equal(response.status, 404, pathname);
    assert.deepEqual(JSON.parse(response.text), { error: "Страница не найдена." });
  }

  const badEncoding = await exchange(app.port, { path: "/%E0%A4%A" });

  assert.equal(badEncoding.status, 400);
  assert.equal(app.messages.length, 0);
});
