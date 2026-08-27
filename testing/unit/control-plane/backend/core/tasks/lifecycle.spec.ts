import { completeTask, rejectTask, requestRework } from '../../../../../../control-plane/backend/core/src/tasks/lifecycle';

function makeClient() {
  return { task: { update: jest.fn() } } as any;
}

describe('completeTask', () => {
  it('marks the task done, recording who completed it and any output record', async () => {
    const client = makeClient();
    client.task.update.mockResolvedValue({ id: 'task-1', status: 'done' });

    await completeTask(client, 'task-1', 'user-1', 'record-1');

    expect(client.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { status: 'done', completedBy: 'user-1', completedAt: expect.any(Date), outputRecordId: 'record-1' },
    });
  });
});

describe('requestRework', () => {
  it('clears the claim and moves the task to needs_rework', async () => {
    const client = makeClient();
    client.task.update.mockResolvedValue({ id: 'task-1', status: 'needs_rework' });

    await requestRework(client, 'task-1');

    expect(client.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { status: 'needs_rework', claimedBy: null, claimedAt: null },
    });
  });
});

describe('rejectTask', () => {
  it('marks the task rejected', async () => {
    const client = makeClient();
    client.task.update.mockResolvedValue({ id: 'task-1', status: 'rejected' });

    await rejectTask(client, 'task-1');

    expect(client.task.update).toHaveBeenCalledWith({ where: { id: 'task-1' }, data: { status: 'rejected' } });
  });
});
