import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CommentStatus } from '@open-derja/db';
import { PrismaService } from '../../../infra/database/prisma.service';
import { CorrectionsService } from '../../corrections/corrections.service';
import { FlagsService } from '../../flags/flags.service';
import {
  SETTING_PUBLICATION_COMMENTS_OPEN,
  SystemSettingsService,
} from '../../../infra/system/system-settings.service';

type LaneType = 'correction' | 'origin' | 'publication' | 'flag';

@Injectable()
export class ReviewLanesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly corrections: CorrectionsService,
    private readonly flags: FlagsService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  async lane(): Promise<{
    corrections: unknown[];
    origins: unknown[];
    publications: unknown[];
    flags: unknown[];
  }> {
    const [corrections, origins, publications, flagRows] = await Promise.all([
      this.prisma.correction.findMany({ where: { status: 'proposed' }, orderBy: { createdAt: 'asc' } }),
      this.prisma.lexiconOrigin.findMany({ where: { status: 'proposed' }, orderBy: { createdAt: 'asc' } }),
      this.prisma.publication.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' } }),
      this.prisma.flag.findMany({ where: { status: 'open' }, orderBy: { createdAt: 'asc' } }),
    ]);
    return { corrections, origins, publications, flags: flagRows };
  }

  async resolve(type: LaneType, id: string, decision: 'accept' | 'reject', actorId: string): Promise<unknown> {
    switch (type) {
      case 'correction':
        return decision === 'accept'
          ? this.corrections.accept(id, actorId)
          : this.corrections.reject(id, actorId);
      case 'flag':
        return decision === 'accept' ? this.flags.resolve(id, actorId) : this.flags.dismiss(id, actorId);
      case 'origin': {
        const origin = await this.prisma.lexiconOrigin.findUnique({ where: { id } });
        if (!origin) throw new NotFoundException('Origin not found');
        return this.prisma.lexiconOrigin.update({
          where: { id },
          data: { status: decision === 'accept' ? 'confirmed' : 'disputed' },
        });
      }
      case 'publication': {
        const pub = await this.prisma.publication.findUnique({ where: { id } });
        if (!pub) throw new NotFoundException('Publication not found');
        return this.prisma.publication.update({
          where: { id },
          data: { status: decision === 'accept' ? 'approved' : 'rejected' },
        });
      }
      default:
        throw new BadRequestException(`Unknown lane type "${type}"`);
    }
  }

  comments(status: CommentStatus = 'pending'): Promise<unknown[]> {
    return this.prisma.publicationComment.findMany({ where: { status }, orderBy: { createdAt: 'asc' } });
  }

  async moderateComment(id: string, decision: 'approve' | 'reject'): Promise<unknown> {
    const comment = await this.prisma.publicationComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    return this.prisma.publicationComment.update({
      where: { id },
      data: { status: decision === 'approve' ? 'approved' : 'rejected' },
    });
  }

  async setCommentsOpen(open: boolean, actorId: string): Promise<{ open: boolean }> {
    await this.systemSettings.set(SETTING_PUBLICATION_COMMENTS_OPEN, open, actorId);
    return { open };
  }
}
