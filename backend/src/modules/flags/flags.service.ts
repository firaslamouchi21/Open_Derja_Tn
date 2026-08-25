import { Injectable, NotFoundException } from '@nestjs/common';
import type { Flag, FlagStatus } from '@open-derja/db';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateFlagDto } from './dto/create-flag.dto';

export interface FlagContext {
  sessionId?: string;
  ipHash?: string;
}

@Injectable()
export class FlagsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateFlagDto, ctx: FlagContext): Promise<Flag> {
    return this.prisma.flag.create({
      data: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        note: dto.note,
        sessionId: ctx.sessionId,
        ipHash: ctx.ipHash,
      },
    });
  }

  findAll(status?: FlagStatus): Promise<Flag[]> {
    return this.prisma.flag.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOne(id: string): Promise<Flag> {
    const flag = await this.prisma.flag.findUnique({ where: { id } });
    if (!flag) {
      throw new NotFoundException('Flag not found');
    }
    return flag;
  }

  async resolve(id: string, resolverId: string): Promise<Flag> {
    await this.findOne(id);
    return this.prisma.flag.update({ where: { id }, data: { status: 'resolved', resolvedBy: resolverId } });
  }

  async dismiss(id: string, resolverId: string): Promise<Flag> {
    await this.findOne(id);
    return this.prisma.flag.update({ where: { id }, data: { status: 'dismissed', resolvedBy: resolverId } });
  }
}
