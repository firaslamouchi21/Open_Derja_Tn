import { writeOutboxEvent } from '../../../../../../control-plane/backend/core/src/outbox/write';

describe('writeOutboxEvent', () => {
  it('creates a pending outbox event with the given type and payload', async () => {
    const client = { outboxEvent: { create: jest.fn().mockResolvedValue({ id: 'event-1' }) } } as any;

    await writeOutboxEvent(client, 'email.verification', { email: 'a@b.com', code: '123456' });

    expect(client.outboxEvent.create).toHaveBeenCalledWith({
      data: { eventType: 'email.verification', payload: { email: 'a@b.com', code: '123456' } },
    });
  });
});
