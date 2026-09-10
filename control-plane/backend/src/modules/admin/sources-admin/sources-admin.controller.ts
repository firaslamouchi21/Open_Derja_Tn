import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { writeAuditLog } from '@open-derja/core';
import { createSourceRunner, runSource } from '@open-derja/scrapers';
import { AdminArea } from '../../../common/decorators/admin-area.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/guards/request-user.interface';
import { PrismaService } from '../../../infra/database/prisma.service';
import { assertConfirmedCount } from '../../../common/assert-confirmed-count';
import { SourcesService } from '../../sources/sources.service';

@Controller('admin/sources')
@AdminArea()
export class SourcesAdminController {
  constructor(
    private readonly sources: SourcesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list() {
    return this.sources.findAll();
  }

  @Get(':id/yield-history')
  async yieldHistory(@Param('id', ParseUUIDPipe) id: string) {
    await this.sources.findOne(id);
    return this.prisma.document.groupBy({
      by: ['rightsStatus'],
      where: { sourceId: id },
      _count: { _all: true },
    });
  }

  @Post(':id/quarantine')
  async quarantine(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('confirmCount') confirmCount: number,
  ) {
    await this.sources.findOne(id);
    const items = await this.prisma.corpusItem.findMany({
      where: { document: { sourceId: id } },
      select: { id: true },
    });
    assertConfirmedCount(items.length, confirmCount);

    await this.prisma.$transaction(async (tx) => {
      await tx.source.update({ where: { id }, data: { active: false } });
      await tx.document.updateMany({ where: { sourceId: id }, data: { rightsStatus: 'revoked' } });
      for (const item of items) {
        await tx.flag.create({
          data: { targetType: 'corpus_item', targetId: item.id, reason: 'copyright', note: 'source quarantined' },
        });
      }
      await writeAuditLog(tx, {
        actorId: user.id,
        action: 'quarantine_source',
        entityType: 'source',
        entityId: id,
        diff: { flaggedItems: items.length },
      });
    });
    return { quarantined: true, flaggedItems: items.length };
  }

  @Post(':id/run')
  async run(@Param('id', ParseUUIDPipe) id: string) {
    const source = await this.sources.findOne(id);
    if (!source.active) {
      throw new BadRequestException(`Source ${id} is not active`);
    }

    try {
      const runner = createSourceRunner(source);
      return await runSource(this.prisma, source, runner);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }
}
