import type { Prisma, PrismaClient, Task } from '@open-derja/db';

export async function completeTask(
  prisma: PrismaClient | Prisma.TransactionClient,
  taskId: string,
  userId: string,
  outputRecordId?: string,
): Promise<Task> {
  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'done',
      completedBy: userId,
      completedAt: new Date(),
      outputRecordId,
    },
  });
}

export async function requestRework(prisma: PrismaClient, taskId: string): Promise<Task> {
  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'needs_rework',
      claimedBy: null,
      claimedAt: null,
    },
  });
}

export async function rejectTask(prisma: PrismaClient, taskId: string): Promise<Task> {
  return prisma.task.update({
    where: { id: taskId },
    data: { status: 'rejected' },
  });
}
