import assert from "node:assert/strict";
import { createServer } from "node:net";
import test from "node:test";
import nodemailer from "nodemailer";
import { createMailSender } from "../server/mail.js";

const configuration = {
  SMTP_HOST: "smtp.example.test",
  SMTP_PORT: "587",
  SMTP_USER: "website@example.test",
  SMTP_PASS: "test-password-never-printed",
  SMTP_FROM: "website@example.test",
  REQUEST_TO: "owner@example.test",
};

const message = { subject: "Website request", text: "Name: Test\nPhone: +79211153143" };
const deliveryError = "Не удалось отправить заявку. Попробуйте ещё раз позже.";

test("missing or invalid configuration never creates a transport", async () => {
  const cases = [
    {},
    ...["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "REQUEST_TO"].map((key) => ({ ...configuration, [key]: "" })),
    { ...configuration, SMTP_PORT: "25" },
    { ...configuration, SMTP_PORT: "587.0" },
    { ...configuration, SMTP_PORT: "587junk" },
    { ...configuration, SMTP_PASS: "   " },
    { ...configuration, SMTP_HOST: "smtp://user:secret@example.test" },
    { ...configuration, SMTP_FROM: "Website <website@example.test>" },
    { ...configuration, SMTP_FROM: "website@example.test\r\nBcc: other@example.test" },
    { ...configuration, REQUEST_TO: "owner@example.test,other@example.test" },
    { ...configuration, REQUEST_TO: "not-an-email" },
  ];

  for (const env of cases) {
    let transportCalls = 0;
    const sender = createMailSender(env, () => {
      transportCalls += 1;
      assert.fail("Invalid configuration must not open a transport");
    });

    assert.equal(sender.ready, false);
    assert.equal(transportCalls, 0);
    await assert.rejects(sender.send(message), { message: "Отправка заявок временно недоступна." });
  }
});

test("SMTP 587 requires verified TLS and keeps logs and resource access disabled", async () => {
  let transportOptions;
  let mailOptions;
  const sender = createMailSender({ ...configuration, SMTP_PORT: undefined }, (options) => {
    transportOptions = options;

    return {
      async sendMail(options) {
        mailOptions = options;

        return { accepted: [configuration.REQUEST_TO], rejected: [] };
      },
    };
  });

  assert.equal(sender.ready, true);
  await sender.send({ ...message, to: "attacker@example.test", from: "attacker@example.test", attachments: [{ path: "secret.txt" }] });
  assert.deepEqual(transportOptions, {
    host: configuration.SMTP_HOST,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: configuration.SMTP_USER, pass: configuration.SMTP_PASS },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
  assert.deepEqual(mailOptions, {
    from: configuration.SMTP_FROM,
    to: configuration.REQUEST_TO,
    envelope: { from: configuration.SMTP_FROM, to: [configuration.REQUEST_TO] },
    ...message,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
});

test("SMTP 465 uses implicit TLS", () => {
  let transportOptions;
  const sender = createMailSender({ ...configuration, SMTP_PORT: "465" }, (options) => {
    transportOptions = options;

    return { async sendMail() { return { accepted: [] }; } };
  });

  assert.equal(sender.ready, true);
  assert.equal(transportOptions.port, 465);
  assert.equal(transportOptions.secure, true);
  assert.equal(transportOptions.requireTLS, true);
  assert.equal(transportOptions.tls.rejectUnauthorized, true);
});

test("configuration and transport errors never expose credentials", async () => {
  const brokenFactory = createMailSender(configuration, () => {
    throw new Error(configuration.SMTP_PASS);
  });

  assert.equal(brokenFactory.ready, false);
  await assert.rejects(brokenFactory.send(message), { message: "Отправка заявок временно недоступна." });

  const brokenTransport = createMailSender(configuration, () => ({
    async sendMail() {
      throw new Error(`AUTH failed for ${configuration.SMTP_USER}: ${configuration.SMTP_PASS}`);
    },
  }));

  await assert.rejects(brokenTransport.send(message), { message: deliveryError });
});

test("delivery requires explicit recipient acceptance with no rejections or pending recipients", async () => {
  const failedResults = [
    undefined,
    {},
    { accepted: [] },
    { accepted: ["another@example.test"] },
    { accepted: [configuration.REQUEST_TO], rejected: [configuration.REQUEST_TO] },
    { accepted: [configuration.REQUEST_TO], rejected: ["another@example.test"] },
    { accepted: [configuration.REQUEST_TO], pending: [configuration.REQUEST_TO] },
  ];

  for (const result of failedResults) {
    const sender = createMailSender(configuration, () => ({ async sendMail() { return result; } }));

    await assert.rejects(sender.send(message), { message: deliveryError });
  }

  const sender = createMailSender(configuration, () => ({
    async sendMail() { return { accepted: [{ address: configuration.REQUEST_TO }], rejected: [] }; },
  }));

  await sender.send(message);
});

test("empty messages and subject header injection are rejected before sending", async () => {
  let sendCalls = 0;
  const sender = createMailSender(configuration, () => ({
    async sendMail() {
      sendCalls += 1;
      assert.fail("Invalid message must not be sent");
    },
  }));

  for (const invalid of [null, {}, { ...message, subject: "" }, { ...message, text: "" }, { ...message, subject: "Request\r\nBcc: other@example.test" }]) {
    await assert.rejects(sender.send(invalid), { message: deliveryError });
  }

  assert.equal(sendCalls, 0);
});

/**
 * A loopback-only SMTP fixture. The production sender never permits plaintext SMTP.
 * @param {import("node:test").TestContext} context
 * @param {boolean} [rejectRecipient]
 * @returns {Promise<{port: number, envelopes: string[], messages: string[]}>}
 */
async function localSmtp(context, rejectRecipient = false) {
  const sockets = new Set();
  const envelopes = [];
  const messages = [];
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.setEncoding("utf8");
    socket.write("220 localhost test SMTP\r\n");

    let buffer = "";
    let receivingData = false;
    let body = [];

    socket.on("data", (chunk) => {
      buffer += chunk;
      let boundary;

      while ((boundary = buffer.indexOf("\r\n")) !== -1) {
        const line = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        if (receivingData) {
          if (line === ".") {
            messages.push(body.join("\r\n"));
            receivingData = false;
            body = [];
            socket.write("250 Message accepted\r\n");
          } else {
            body.push(line.startsWith("..") ? line.slice(1) : line);
          }

          continue;
        }

        if (/^(EHLO|HELO) /i.test(line)) {
          socket.write("250 localhost\r\n");
        } else if (line === "STARTTLS") {
          socket.write("454 TLS unavailable in test fixture\r\n");
        } else if (/^MAIL FROM:/i.test(line)) {
          envelopes.push(line);
          socket.write("250 Sender accepted\r\n");
        } else if (/^RCPT TO:/i.test(line)) {
          envelopes.push(line);
          socket.write(rejectRecipient ? "550 Recipient refused\r\n" : "250 Recipient accepted\r\n");
        } else if (line === "DATA") {
          receivingData = true;
          socket.write("354 End with a dot\r\n");
        } else if (line === "QUIT") {
          socket.end("221 Goodbye\r\n");
        } else {
          socket.write("250 OK\r\n");
        }
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  context.after(async () => {
    for (const socket of sockets) socket.destroy();

    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  return { port: server.address().port, envelopes, messages };
}

test("SMTP integration sends the expected message and fixed envelope to a local server", { timeout: 10_000 }, async (context) => {
  const smtp = await localSmtp(context);
  const sender = createMailSender(configuration, (options) => nodemailer.createTransport({
    ...options,
    host: "127.0.0.1",
    port: smtp.port,
    secure: false,
    requireTLS: false,
    ignoreTLS: true,
    auth: undefined,
  }));

  await sender.send(message);
  assert.deepEqual(smtp.envelopes, [
    `MAIL FROM:<${configuration.SMTP_FROM}>`,
    `RCPT TO:<${configuration.REQUEST_TO}>`,
  ]);
  assert.equal(smtp.messages.length, 1);
  assert.match(smtp.messages[0], /^From: website@example\.test\r$/m);
  assert.match(smtp.messages[0], /^To: owner@example\.test\r$/m);
  assert.match(smtp.messages[0], /^Subject: Website request\r$/m);
  assert.match(smtp.messages[0], /Name: Test\r\nPhone: \+79211153143/);
});

test("SMTP integration reports rejection without claiming delivery", { timeout: 10_000 }, async (context) => {
  const smtp = await localSmtp(context, true);
  const sender = createMailSender(configuration, (options) => nodemailer.createTransport({
    ...options,
    host: "127.0.0.1",
    port: smtp.port,
    secure: false,
    requireTLS: false,
    ignoreTLS: true,
    auth: undefined,
  }));

  await assert.rejects(sender.send(message), { message: deliveryError });
  assert.equal(smtp.messages.length, 0);
});

test("SMTP integration refuses plaintext delivery when STARTTLS is unavailable", { timeout: 10_000 }, async (context) => {
  const smtp = await localSmtp(context);
  const sender = createMailSender(configuration, (options) => nodemailer.createTransport({
    ...options,
    host: "127.0.0.1",
    port: smtp.port,
    auth: undefined,
  }));

  await assert.rejects(sender.send(message), { message: deliveryError });
  assert.equal(smtp.envelopes.length, 0);
  assert.equal(smtp.messages.length, 0);
});
