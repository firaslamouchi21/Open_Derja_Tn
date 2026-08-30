export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailTransportConfig {
  resendApiKey?: string;
  smtpUrl?: string;
  from: string;
}

export function mailConfigFromEnv(env: NodeJS.ProcessEnv = process.env): MailTransportConfig {
  return {
    resendApiKey: env.RESEND_API_KEY || undefined,
    smtpUrl: env.SMTP_URL || undefined,
    from: env.MAIL_FROM || 'OpenDerja <no-reply@localhost>',
  };
}

async function sendViaResend(email: OutboundEmail, config: MailTransportConfig): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend rejected the message: ${response.status} ${await response.text()}`);
  }
}

async function sendViaSmtp(email: OutboundEmail, config: MailTransportConfig): Promise<void> {
  let nodemailer: { createTransport: (url: string) => { sendMail: (opts: unknown) => Promise<unknown> } };
  try {
    nodemailer = (await import('nodemailer' as string)) as typeof nodemailer;
  } catch {
    throw new Error('SMTP fallback requires the "nodemailer" package to be installed');
  }
  const transport = nodemailer.createTransport(config.smtpUrl as string);
  await transport.sendMail({ from: config.from, ...email });
}

export async function sendEmail(email: OutboundEmail, config: MailTransportConfig): Promise<'resend' | 'smtp'> {
  if (config.resendApiKey) {
    try {
      await sendViaResend(email, config);
      return 'resend';
    } catch (error) {
      if (!config.smtpUrl) {
        throw error;
      }
    }
  }
  if (config.smtpUrl) {
    await sendViaSmtp(email, config);
    return 'smtp';
  }
  throw new Error('No mail transport configured — set RESEND_API_KEY or SMTP_URL');
}

export interface OutboxEmailPayload {
  email: string;
  code?: string;
  token?: string;
}

export function renderOutboxEmail(eventType: string, payload: OutboxEmailPayload): OutboundEmail {
  switch (eventType) {
    case 'email.verification':
      return {
        to: payload.email,
        subject: 'Your OpenDerja verification code',
        text: `Your verification code is ${payload.code}. It expires in 15 minutes.`,
      };
    case 'email.password_reset':
      return {
        to: payload.email,
        subject: 'Reset your OpenDerja password',
        text: `Your password reset code is ${payload.code}. It expires in 20 minutes.`,
      };
    case 'email.reviewer_invite':
      return {
        to: payload.email,
        subject: 'You have been invited to review on OpenDerja',
        text: `You have been invited to join OpenDerja as a reviewer. Accept with this token: ${payload.token}`,
      };
    default:
      throw new Error(`No email template for outbox event type "${eventType}"`);
  }
}
