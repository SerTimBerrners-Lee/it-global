import nodemailer from "nodemailer";

/**
 * @typedef {{subject: string, text: string}} MailMessage
 * @typedef {{ready: boolean, send: (message: MailMessage) => Promise<void>}} MailSender
 * @typedef {{address?: string} | string} MailAddress
 * @typedef {{accepted?: MailAddress[], rejected?: MailAddress[], pending?: unknown[]}} DeliveryResult
 * @typedef {{sendMail: (options: object) => Promise<DeliveryResult>}} MailTransport
 * @typedef {(options: object) => MailTransport} TransportFactory
 */

const deliveryError = "Не удалось отправить заявку. Попробуйте ещё раз позже.";
const unavailableError = "Отправка заявок временно недоступна.";

/** @param {unknown} value @returns {boolean} */
function isEmail(value) {
  return typeof value === "string"
    && value.length <= 254
    && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(value);
}

/** @param {MailAddress} address @returns {string} */
function normalizeAddress(address) {
  const value = typeof address === "string" ? address : address?.address;

  return typeof value === "string" ? value.toLowerCase() : "";
}

/** @returns {MailSender} */
function unavailableSender() {
  return {
    ready: false,
    /** @returns {Promise<void>} */
    async send() {
      throw new Error(unavailableError);
    },
  };
}

/**
 * SMTP credentials and addresses come exclusively from server configuration.
 * A ready sender has valid configuration; delivery is confirmed by the SMTP server.
 * @param {Record<string, string | undefined>} [env]
 * @param {TransportFactory} [transportFactory]
 * @returns {MailSender}
 */
export function createMailSender(env = process.env, transportFactory = nodemailer.createTransport) {
  const host = env.SMTP_HOST?.trim();
  const portValue = env.SMTP_PORT?.trim() || "587";
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS;
  const from = env.SMTP_FROM?.trim();
  const to = env.REQUEST_TO?.trim();

  if (!host || /[\s/@\\]/u.test(host)
    || !["465", "587"].includes(portValue)
    || !user || !pass || !pass.trim()
    || !isEmail(from) || !isEmail(to)) {
    return unavailableSender();
  }

  const port = Number(portValue);
  let transport;

  try {
    transport = transportFactory({
      host,
      port,
      secure: port === 465,
      requireTLS: true,
      auth: { user, pass },
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: false,
      debug: false,
    });
  } catch {
    return unavailableSender();
  }

  return {
    ready: true,
    /** @param {MailMessage} message @returns {Promise<void>} */
    async send(message) {
      try {
        if (!message || typeof message.subject !== "string"
          || !message.subject.trim() || /[\r\n]/u.test(message.subject)
          || typeof message.text !== "string" || !message.text.trim()) {
          throw new Error(deliveryError);
        }

        const result = await transport.sendMail({
          from,
          to,
          envelope: { from, to: [to] },
          subject: message.subject,
          text: message.text,
          disableFileAccess: true,
          disableUrlAccess: true,
        });

        if (!Array.isArray(result?.accepted)
          || !result.accepted.some((address) => normalizeAddress(address) === to.toLowerCase())
          || (result.rejected?.length ?? 0) > 0
          || (result.pending?.length ?? 0) > 0) {
          throw new Error(deliveryError);
        }
      } catch {
        throw new Error(deliveryError);
      }
    },
  };
}
