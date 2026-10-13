import { createApp } from "./server.js";
import { createMailSender } from "./mail.js";

const port = Number(process.env.PORT || 8765);
const host = process.env.HOST || "127.0.0.1";
const publicUrl = new URL(process.env.PUBLIC_URL || "https://its-global.ru");

if (!Number.isInteger(port) || port < 1 || port > 65535 || !["http:", "https:"].includes(publicUrl.protocol)) {
  throw new Error("Проверьте PORT и PUBLIC_URL в настройках сервера.");
}

const sender = createMailSender();
const allowedOrigins = [publicUrl.origin];

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push(`http://127.0.0.1:${port}`, `http://localhost:${port}`);
}

const server = createApp({ sender, allowedOrigins, trustProxy: process.env.TRUST_PROXY === "true" });

server.listen(port, host, () => {
  console.info(`IT Global: http://${host}:${port}`);
  console.info(sender.ready ? "Почтовые настройки загружены." : "Для отправки заявок заполните настройки SMTP в .env.");
});

/** @returns {void} */
function shutdown() {
  server.close();
  setTimeout(() => process.exit(0), 30_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
