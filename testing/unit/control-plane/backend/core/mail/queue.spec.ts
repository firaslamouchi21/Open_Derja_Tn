import { queuePasswordResetEmail, queueReviewerInviteEmail, queueVerificationEmail } from '../../../../../../control-plane/backend/core/src/mail/queue';

function makeClient() {
  return { outboxEvent: { create: jest.fn().mockResolvedValue({ id: 'event-1' }) } } as any;
}

describe('queueVerificationEmail', () => {
  it('queues an email.verification outbox event', async () => {
    const client = makeClient();
    await queueVerificationEmail(client, { email: 'a@b.com', code: '123456' });
    expect(client.outboxEvent.create).toHaveBeenCalledWith({
      data: { eventType: 'email.verification', payload: { email: 'a@b.com', code: '123456' } },
    });
  });
});

describe('queuePasswordResetEmail', () => {
  it('queues an email.password_reset outbox event', async () => {
    const client = makeClient();
    await queuePasswordResetEmail(client, { email: 'a@b.com', code: '654321' });
    expect(client.outboxEvent.create).toHaveBeenCalledWith({
      data: { eventType: 'email.password_reset', payload: { email: 'a@b.com', code: '654321' } },
    });
  });
});

describe('queueReviewerInviteEmail', () => {
  it('queues an email.reviewer_invite outbox event', async () => {
    const client = makeClient();
    await queueReviewerInviteEmail(client, { email: 'a@b.com', token: 't1', invitedBy: 'admin-1' });
    expect(client.outboxEvent.create).toHaveBeenCalledWith({
      data: { eventType: 'email.reviewer_invite', payload: { email: 'a@b.com', token: 't1', invitedBy: 'admin-1' } },
    });
  });
});
