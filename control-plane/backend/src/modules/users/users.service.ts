import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, UserRole } from '@open-derja/db';
import { PrismaService } from '../../infra/database/prisma.service';
import { PromoteUserDto } from './dto/promote-user.dto';
import { AdjustTrustDto } from './dto/adjust-trust.dto';
import { BanUserDto } from './dto/ban-user.dto';

const SAFE_SELECT = {
  id: true,
  role: true,
  displayName: true,
  email: true,
  trustLevel: true,
  regionSelfReported: true,
  active: true,
  emailConfirmed: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof SAFE_SELECT }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(role?: UserRole): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async promoteToReviewer(id: string, dto: PromoteUserDto, actorId: string): Promise<SafeUser> {
    await this.findOne(id);
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { role: 'reviewer', regionSelfReported: dto.regionSelfReported },
        select: SAFE_SELECT,
      }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: 'promote_to_reviewer',
          entityType: 'user',
          entityId: id,
          diff: { role: 'reviewer', regionSelfReported: dto.regionSelfReported },
        },
      }),
    ]);
    return user;
  }

  async adjustTrust(id: string, dto: AdjustTrustDto, actorId: string): Promise<SafeUser> {
    const before = await this.findOne(id);
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { trustLevel: dto.trustLevel }, select: SAFE_SELECT }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: 'adjust_trust',
          entityType: 'user',
          entityId: id,
          diff: { from: before.trustLevel, to: dto.trustLevel, reason: dto.reason },
        },
      }),
    ]);
    return user;
  }

  async ban(id: string, dto: BanUserDto, actorId: string): Promise<SafeUser> {
    await this.findOne(id);
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { active: false }, select: SAFE_SELECT }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: 'ban',
          entityType: 'user',
          entityId: id,
          diff: { active: false, reason: dto.reason },
        },
      }),
    ]);
    return user;
  }
}
