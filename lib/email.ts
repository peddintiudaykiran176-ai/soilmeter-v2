import nodemailer from "nodemailer";

type AuthEmail = {
  to: string;
  subject: string;
  heading: string;
  url: string;
  action: string;
};

function getSmtpConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } =
    process.env;
  const port = Number(SMTP_PORT);

  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !SMTP_USER ||
    !SMTP_PASSWORD ||
    !SMTP_FROM
  ) {
    throw new Error(
      "Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.",
    );
  }

  return { host: SMTP_HOST, port, user: SMTP_USER, password: SMTP_PASSWORD, from: SMTP_FROM };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function isEmailDeliveryConfigured() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } =
    process.env;
  const port = Number(SMTP_PORT);
  return Boolean(
    SMTP_HOST &&
      SMTP_PORT &&
      Number.isInteger(port) &&
      port >= 1 &&
      port <= 65535 &&
      SMTP_USER &&
      SMTP_PASSWORD &&
      SMTP_FROM,
  );
}

export async function sendAuthEmail({
  to,
  subject,
  heading,
  url,
  action,
}: AuthEmail) {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    tls: { minVersion: "TLSv1.2" },
    auth: { user: config.user, pass: config.password },
  });
  const safeUrl = escapeHtml(url);

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text: `${heading}\n\n${action}: ${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#102a43"><h1>${heading}</h1><p><a href="${safeUrl}" style="display:inline-block;background:#14532d;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${action}</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
  });
}
