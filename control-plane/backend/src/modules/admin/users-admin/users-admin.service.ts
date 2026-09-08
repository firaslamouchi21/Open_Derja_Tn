import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { queueReviewerInviteEmail, writeAuditLog } from '@open-derja/core';
import type { Region, UserRole } from '@open-derja/db';
import { PrismaService } from '../../../infra/database/prisma.service';
import { assertConfirmedCount } from '../../../common/assert-confirmed-count';
import { BanUserWithRevertDto, InviteReviewerDto, SetUserRoleDto } from '../dto/admin.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class UsersAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async quality(userId: string): Promise<unknown> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException('User not found');

    const [approved, rejected, tagsByRegion] = await Promise.all([
      this.prisma.task.count({ where: { completedBy: userId, status: 'done' } }),
      this.prisma.task.count({ where: { completedBy: userId, status: 'rejected' } }),
      this.prisma.tag.groupBy({
        by: ['value'],
        where: { annotatorId: userId, kind: 'region' },
        _count: { _all: true },
      }),
    ]);
    const total = approved + rejected;
    return {
      approved,
      rejected,
      approvalRate: total ? approved / total : null,
      regions: tagsByRegion.map((r) => ({ region: r.value, count: r._count._all })),
    };
  }

  async inviteReviewer(dto: InviteReviewerDto, actorId: string): Promise<{ email: string; expiresAt: Date }> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.reviewerInvite.create({
        data: { email: dto.email, tokenHash, region: dto.region as Region, invitedBy: actorId, expiresAt },
      });
      await queueReviewerInviteEmail(tx, { email: dto.email, token: rawToken, invitedBy: actorId });
      await writeAuditLog(tx, {
        actorId,
        action: 'invite_reviewer',
        entityType: 'reviewer_invite',
        entityId: '00000000-0000-0000-0000-000000000000',
        diff: { email: dto.email, region: dto.region },
      });
    });

    return { email: dto.email, expiresAt };
  }

  async banWithRevert(userId: string, dto: BanUserWithRevertDto, actorId: string): Promise<{ reverted: number }> {
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === 'admin' || target.role === 'superadmin') {
      throw new ForbiddenException('Only a superadmin can ban an admin — use the role controls');
    }

    const openTasks = await this.prisma.task.findMany({
      where: { completedBy: userId, status: 'done' },
      select: { id: true },
    });
    assertConfirmedCount(openTasks.length, dto.confirmCount);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { active: false, tokenVersion: { increment: 1 } } });
      await tx.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.task.updateMany({
        where: { id: { in: openTasks.map((t) => t.id) } },
        data: { status: 'needs_rework', completedBy: null, completedAt: null, claimedBy: null, claimedAt: null },
      });
      await writeAuditLog(tx, {
        actorId,
        action: 'ban_user_with_revert',
        entityType: 'user',
        entityId: userId,
        diff: { reason: dto.reason, revertedTasks: openTasks.length },
      });
    });

    return { reverted: openTasks.length };
  }

  async setRole(userId: string, dto: SetUserRoleDto, actorId: string): Promise<unknown> {
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) throw new NotFoundException('User not found');
    if (userId === actorId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { role: dto.role as UserRole, tokenVersion: { increment: 1 } },
      });
      await tx.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await writeAuditLog(tx, {
        actorId,
        action: 'set_user_role',
        entityType: 'user',
        entityId: userId,
        diff: { from: target.role, to: dto.role, reason: dto.reason },
      });
      return u;
    });
    return { id: updated.id, role: updated.role };
  }
}
