import { spawnTask, spawnTasks, type TaskSpec } from '../../../../../../control-plane/backend/core/src/tasks/spawn';

function makeClient() {
  return { task: { create: jest.fn() } } as any;
}

const SPEC: TaskSpec = {
  corpusItemId: 'item-1',
  type: 'review',
  itemVersion: 1,
  slot: '',
  requiresRole: 'reviewer',
};

describe('spawnTask', () => {
  it('creates the task with a deterministic idempotency key derived from the spec', async () => {
    const client = makeClient();
    client.task.create.mockResolvedValue({ id: 'task-1' });

    const result = await spawnTask(client, SPEC);

    expect(result).toEqual({ spawned: true });
    const createCall = client.task.create.mock.calls[0][0];
    expect(createCall.data).toMatchObject({
      corpusItemId: 'item-1',
      type: 'review',
      itemVersion: 1,
      idempotencySlot: '',
      requiresRole: 'reviewer',
      priority: 0,
      targetRegions: [],
    });
    expect(createCall.data.idemKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('defaults priority to 0 and targetRegions to an empty array when omitted', async () => {
    const client = makeClient();
    client.task.create.mockResolvedValue({ id: 'task-1' });

    await spawnTask(client, SPEC);

    expect(client.task.create.mock.calls[0][0].data.priority).toBe(0);
    expect(client.task.create.mock.calls[0][0].data.targetRegions).toEqual([]);
  });

  it('passes through an explicit priority and targetRegions', async () => {
    const client = makeClient();
    client.task.create.mockResolvedValue({ id: 'task-1' });

    await spawnTask(client, { ...SPEC, priority: 5, targetRegions: ['sahel'] });

    expect(client.task.create.mock.calls[0][0].data.priority).toBe(5);
    expect(client.task.create.mock.calls[0][0].data.targetRegions).toEqual(['sahel']);
  });

  it('treats a unique-constraint violation as an already-spawned no-op rather than an error', async () => {
    const client = makeClient();
    client.task.create.mockRejectedValue({ code: 'P2002' });

    await expect(spawnTask(client, SPEC)).resolves.toEqual({ spawned: false });
  });

  it('rethrows any other error', async () => {
    const client = makeClient();
    client.task.create.mockRejectedValue(new Error('connection lost'));

    await expect(spawnTask(client, SPEC)).rejects.toThrow('connection lost');
  });
});

describe('spawnTasks', () => {
  it('aggregates spawned and skipped counts across a batch', async () => {
    const client = makeClient();
    client.task.create
      .mockResolvedValueOnce({ id: 't1' })
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({ id: 't3' });

    const result = await spawnTasks(client, [SPEC, { ...SPEC, slot: '1' }, { ...SPEC, slot: '2' }]);

    expect(result).toEqual({ spawned: 2, skipped: 1 });
  });

  it('returns zero/zero for an empty batch', async () => {
    const client = makeClient();
    await expect(spawnTasks(client, [])).resolves.toEqual({ spawned: 0, skipped: 0 });
    expect(client.task.create).not.toHaveBeenCalled();
  });
});
