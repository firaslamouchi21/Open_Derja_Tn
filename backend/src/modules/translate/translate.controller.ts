import { Controller, Get, Query } from '@nestjs/common';
import { getTranslatorCoverage, lookupTranslation, type TranslateCoverageResult, type TranslateLookupResult } from '@open-derja/core';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../infra/database/prisma.service';
import { TranslateQueryDto } from './dto/translate-query.dto';

@Controller('translate')
export class TranslateController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  lookup(@Query() query: TranslateQueryDto): Promise<TranslateLookupResult> {
    return lookupTranslation(this.prisma, query.text, query.region, query.includeVulgar);
  }

  @Get('coverage')
  @Public()
  coverage(): Promise<TranslateCoverageResult> {
    return getTranslatorCoverage(this.prisma);
  }
}
