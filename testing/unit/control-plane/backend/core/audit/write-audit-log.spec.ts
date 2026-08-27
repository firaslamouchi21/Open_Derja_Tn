import { writeAuditLog } from '../../../../../../control-plane/backend/core/src/audit/write-audit-log';

describe('writeAuditLog', () => {
  it('creates an audit log row with the given actor, action, and diff', async () => {
    const client = { auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) } } as any;

    await writeAuditLog(client, {
      actorId: 'actor-1',
      action: 'ban',
      entityType: 'user',
      entityId: 'user-1',
      diff: { active: false },
    });

    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'actor-1',
        action: 'ban',
        entityType: 'user',
        entityId: 'user-1',
        diff: { active: false },
        ipHash: undefined,
      },
    });
  });
});
