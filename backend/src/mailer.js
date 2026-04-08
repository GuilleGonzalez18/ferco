import nodemailer from 'nodemailer';

function parseFrom(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/^(.*)<([^>]+)>$/);
  if (!match) return { name: '', email: raw };
  return {
    name: String(match[1] || '').trim().replace(/^"|"$/g, ''),
    email: String(match[2] || '').trim(),
  };
}

async function sendMailViaBrevo({ from, to, subject, text, attachments = [] }) {
  const apiKey = String(process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) return false;

  const sender = parseFrom(from);
  if (!sender?.email) {
    throw new Error('Remitente inválido para Brevo');
  }

  const payload = {
    sender,
    to: [{ email: String(to || '').trim() }],
    subject: String(subject || ''),
    textContent: String(text || ''),
  };

  if (Array.isArray(attachments) && attachments.length > 0) {
    payload.attachment = attachments.map((a) => ({
      name: String(a.filename || 'adjunto.pdf'),
      content: String(a.content || ''),
    }));
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${body}`);
  }

  return true;
}

function getSmtpTransport() {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendMail({ from, to, subject, text, attachments = [] }) {
  const sentByBrevo = await sendMailViaBrevo({ from, to, subject, text, attachments });
  if (sentByBrevo) return;

  const transport = getSmtpTransport();
  if (!transport) {
    throw new Error('No hay proveedor de email configurado (BREVO_API_KEY o SMTP_*)');
  }

  await transport.sendMail({
    from,
    to,
    subject,
    text,
    attachments,
  });
}

