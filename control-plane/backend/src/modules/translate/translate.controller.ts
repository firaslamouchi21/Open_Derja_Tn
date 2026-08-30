import { Controller, Get, Query } from '@nestjs/common';
import {
  getTranslatorCoverage,
  isLookupHit,
  logTranslatorLookup,
  lookupTranslation,
  type TranslateCoverageResult,
  type TranslateLookupResult,
} from '@open-derja/core';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../infra/database/prisma.service';
import { TranslateQueryDto } from './dto/translate-query.dto';

@Controller('translate')
export class TranslateController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  async lookup(@Query() query: TranslateQueryDto): Promise<TranslateLookupResult> {
    const result = await lookupTranslation(this.prisma, query.text, query.region, query.includeVulgar);
    await logTranslatorLookup(this.prisma, {
      queryText: query.text,
      matchKey: result.matchKey,
      region: query.region,
      hit: isLookupHit(result),
    }).catch(() => undefined);
    return result;
  }

  @Get('coverage')
  @Public()
  coverage(): Promise<TranslateCoverageResult> {
    return getTranslatorCoverage(this.prisma);
  }
}
