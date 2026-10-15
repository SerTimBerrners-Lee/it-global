import http from "node:http";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RequestError, validateRequest, formatRequest } from "./request.js";

const publicDirectory = path.resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const bodyLimit = 16 * 1024;
const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/** @param {string} extension @returns {string} */
function cacheControl(extension) {
  if ([".css", ".js"].includes(extension)) return "public, max-age=0, must-revalidate";
  if ([".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".ico", ".woff", ".woff2"].includes(extension)) {
    return "public, max-age=86400";
  }

  return "no-cache";
}

/** @param {string | undefined} condition @param {string} etag @returns {boolean} */
function matchesEtag(condition, etag) {
  if (!condition) return false;
  if (condition.trim() === "*") return true;

  return condition.split(",").some((value) => value.trim().replace(/^W\//, "") === etag.slice(2));
}

/** @param {http.ServerResponse} response @param {number} status @param {object} data @returns {void} */
function json(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

/** @param {http.IncomingMessage} request @returns {Promise<unknown>} */
function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;

      if (size > bodyLimit) {
        chunks.length = 0;
        reject(new RequestError("Заявка слишком большая. Сократите описание задачи.", 413));
        return;
      }

      chunks.push(chunk);
    });
    request.on("end", () => {
      if (size > bodyLimit) return;

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new RequestError("Не удалось прочитать заявку. Попробуйте ещё раз."));
      }
    });
    request.on("error", () => reject(new RequestError("Соединение прервано.", 400)));
  });
}

/** @param {http.IncomingMessage} request @param {boolean} trustProxy @returns {string} */
function clientAddress(request, trustProxy) {
  const peer = request.socket.remoteAddress || "unknown";
  const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer);
  const forwarded = request.headers["x-forwarded-for"];

  if (trustProxy && local && typeof forwarded === "string" && isIP(forwarded.trim())) {
    return forwarded.trim();
  }

  return peer;
}

/** @param {http.IncomingMessage} request @param {http.ServerResponse} response @param {URL} url @returns {Promise<void>} */
async function serveFile(request, response, url) {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.setHeader("Allow", "GET, HEAD");
    json(response, 405, { error: "Метод не поддерживается." });
    return;
  }

  let decoded;

  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    json(response, 400, { error: "Некорректный адрес." });
    return;
  }

  if (decoded.includes("\\") || decoded.includes("\0")
    || decoded.split("/").some((part) => part.startsWith(".")) || decoded.includes(":")) {
    json(response, 404, { error: "Страница не найдена." });
    return;
  }

  let filename = path.resolve(publicDirectory, "." + decoded);

  if (filename !== publicDirectory && !filename.startsWith(publicDirectory + path.sep)) {
    json(response, 404, { error: "Страница не найдена." });
    return;
  }

  try {
    let info = await stat(filename);
    const directory = info.isDirectory();

    if (directory) {
      filename = path.join(filename, "index.html");
      info = await stat(filename);
    }

    if (!info.isFile()) {
      json(response, 404, { error: "Страница не найдена." });
      return;
    }

    if ((directory && !url.pathname.endsWith("/")) || (!directory && path.basename(filename) === "index.html")) {
      const relative = path.relative(publicDirectory, path.dirname(filename));
      const segments = relative.split(path.sep).filter(Boolean).map(encodeURIComponent);
      const canonicalPath = "/" + (segments.length ? segments.join("/") + "/" : "");

      response.writeHead(301, { Location: canonicalPath + url.search });
      response.end();
      return;
    }

    const body = await readFile(filename);
    const extension = path.extname(filename).toLowerCase();
    // A content digest also changes when a deployment preserves file size and timestamps.
    // Weak comparison remains valid when the reverse proxy compresses the response.
    const etag = 'W/"' + createHash("sha256").update(body).digest("hex") + '"';

    response.setHeader("Cache-Control", cacheControl(extension));
    response.setHeader("ETag", etag);

    if (matchesEtag(request.headers["if-none-match"], etag)) {
      response.writeHead(304);
      response.end();
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Content-Length": body.length,
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    json(response, 404, { error: "Страница не найдена." });
  }
}

/**
 * @param {{sender: import('./mail.js').MailSender, allowedOrigins: string[], trustProxy?: boolean, rateLimit?: number, rateWindowMs?: number}} options
 * @returns {http.Server}
 */
export function createApp({ sender, allowedOrigins, trustProxy = false, rateLimit = 5, rateWindowMs = 600_000 }) {
  const origins = new Set(allowedOrigins);
  /** @type {Map<string, {count: number, expires: number}>} */
  const attempts = new Map();

  return http.createServer({ maxHeaderSize: 16_384, requestTimeout: 30_000, headersTimeout: 15_000 }, async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Cache-Control", "no-cache");

    try {
      const url = new URL(request.url, "http://localhost");

      if (url.pathname !== "/api/requests") {
        await serveFile(request, response, url);
        return;
      }

      response.setHeader("Cache-Control", "no-store");

      if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        throw new RequestError("Метод не поддерживается.", 405);
      }

      if ((request.headers.origin && !origins.has(request.headers.origin))
        || request.headers["sec-fetch-site"] === "cross-site") {
        throw new RequestError("Отправьте заявку с сайта IT Global.", 403);
      }

      if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] || "")) {
        throw new RequestError("Неподдерживаемый формат заявки.", 415);
      }

      if (Number(request.headers["content-length"]) > bodyLimit) {
        throw new RequestError("Заявка слишком большая. Сократите описание задачи.", 413);
      }

      const now = Date.now();

      for (const [address, entry] of attempts) {
        if (entry.expires <= now) attempts.delete(address);
      }

      const address = clientAddress(request, trustProxy);
      const entry = attempts.get(address) || { count: 0, expires: now + rateWindowMs };

      if (entry.count >= rateLimit || (!attempts.has(address) && attempts.size >= 10_000)) {
        response.setHeader("Retry-After", String(Math.max(1, Math.ceil((entry.expires - now) / 1000))));
        throw new RequestError("Слишком много попыток. Повторите через несколько минут или позвоните нам.", 429);
      }

      entry.count += 1;
      attempts.set(address, entry);
      const data = validateRequest(await readJson(request));

      if (!sender.ready) {
        throw new RequestError("Отправка заявок временно недоступна. Позвоните нам: +7 (921) 115-31-43.", 503);
      }

      try {
        await sender.send(formatRequest(data));
      } catch {
        throw new RequestError("Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам: +7 (921) 115-31-43.", 502);
      }

      json(response, 200, { ok: true });
    } catch (error) {
      const known = error instanceof RequestError;

      if (!response.headersSent && !response.destroyed) {
        json(response, known ? error.status : 500, {
          error: known ? error.message : "Не удалось обработать заявку. Попробуйте ещё раз позже.",
        });
      }
    }
  });
}
