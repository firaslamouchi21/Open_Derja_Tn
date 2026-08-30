import { BadRequestException, Injectable } from '@nestjs/common';
import { previewRevocationScrub, writeAuditLog } from '@open-derja/core';
import type { RevocationScope } from '@open-derja/db';
import { PrismaService } from '../../../infra/database/prisma.service';
import { CreateRevocationDto } from '../dto/admin.dto';

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  async createRevocation(dto: CreateRevocationDto, actorId: string): Promise<unknown> {
    if (!dto.subjectSessionId && !dto.subjectUserId) {
      throw new BadRequestException('Provide subjectSessionId or subjectUserId');
    }
    const revocation = await this.prisma.consentRevocation.create({
      data: {
        subjectSessionId: dto.subjectSessionId,
        subjectUserId: dto.subjectUserId,
        scope: dto.scope as RevocationScope,
        requestedBy: actorId,
      },
    });
    await writeAuditLog(this.prisma, {
      actorId,
      action: 'consent_revocation_requested',
      entityType: 'consent_revocation',
      entityId: revocation.id,
      diff: { scope: dto.scope },
    });
    return { id: revocation.id, status: revocation.status };
  }

  log(): Promise<unknown[]> {
    return this.prisma.consentRevocation.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, scope: true, status: true, processedAt: true, scrubbedCount: true, createdAt: true },
    });
  }

  preview(subjectSessionId?: string, subjectUserId?: string): Promise<unknown> {
    if (!subjectSessionId && !subjectUserId) {
      throw new BadRequestException('Provide session or user');
    }
    return previewRevocationScrub(this.prisma, {
      subjectSessionId: subjectSessionId ?? null,
      subjectUserId: subjectUserId ?? null,
      scope: 'full',
    });
  }

  async subjectAccessRequest(subjectSessionId?: string, subjectUserId?: string): Promise<unknown> {
    if (!subjectSessionId && !subjectUserId) {
      throw new BadRequestException('Provide session or user');
    }
    const [submissions, contributorStats, user, origins] = await Promise.all([
      subjectSessionId
        ? this.prisma.submissionMeta.findMany({ where: { sessionId: subjectSessionId } })
        : Promise.resolve([]),
      subjectSessionId
        ? this.prisma.contributorStats.findUnique({ where: { sessionId: subjectSessionId } })
        : Promise.resolve(null),
      subjectUserId
        ? this.prisma.user.findUnique({
            where: { id: subjectUserId },
            select: { id: true, email: true, displayName: true, role: true, createdAt: true },
          })
        : Promise.resolve(null),
      subjectSessionId
        ? this.prisma.lexiconOrigin.findMany({ where: { sessionId: subjectSessionId } })
        : Promise.resolve([]),
    ]);
    return { submissions, contributorStats, user, origins };
  }
}
