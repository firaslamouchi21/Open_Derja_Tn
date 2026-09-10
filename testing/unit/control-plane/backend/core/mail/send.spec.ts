import { renderOutboxEmail, sendEmail } from '../../../../../../control-plane/backend/core/src/mail/send';

describe('renderOutboxEmail', () => {
  it('renders the verification code email', () => {
    const mail = renderOutboxEmail('email.verification', { email: 'a@b.com', code: '123456' });
    expect(mail.to).toBe('a@b.com');
    expect(mail.text).toContain('123456');
  });

  it('renders the reviewer invite email with the token', () => {
    const mail = renderOutboxEmail('email.reviewer_invite', { email: 'a@b.com', token: 'tok-1' });
    expect(mail.text).toContain('tok-1');
  });

  it('throws for an unknown event type', () => {
    expect(() => renderOutboxEmail('email.unknown', { email: 'a@b.com' })).toThrow(/no email template/i);
  });
});

describe('sendEmail', () => {
  const mail = { to: 'a@b.com', subject: 's', text: 't' };

  it('throws when no transport is configured', async () => {
    await expect(sendEmail(mail, { from: 'x' })).rejects.toThrow(/No mail transport/);
  });

  it('uses Resend when an API key is present', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const via = await sendEmail(mail, { from: 'x', resendApiKey: 'key' });
    expect(via).toBe('resend');
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ method: 'POST' }));
    fetchMock.mockRestore();
  });
});
