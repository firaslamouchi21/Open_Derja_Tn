import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import {
  TranslateService,
  type TranslateCoverageResult,
  type TranslateLookupResult,
} from './translate.service';
import { TranslateQueryDto } from './dto/translate-query.dto';

@Controller('translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Get()
  @Public()
  lookup(@Query() query: TranslateQueryDto): Promise<TranslateLookupResult> {
    return this.translateService.lookup(query.text, query.region);
  }

  @Get('coverage')
  @Public()
  coverage(): Promise<TranslateCoverageResult> {
    return this.translateService.coverage();
  }
}
