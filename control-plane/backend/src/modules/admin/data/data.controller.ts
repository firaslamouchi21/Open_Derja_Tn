import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AdminArea } from '../../../common/decorators/admin-area.decorator';
import { Superadmin } from '../../../common/decorators/superadmin.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/guards/request-user.interface';
import { DataService } from './data.service';
import { BulkReassignRegionDto, BulkRejectScrapeBatchDto, MergeLexiconDto } from '../dto/admin.dto';

@Controller('admin/data')
@AdminArea()
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('translator-misses')
  translatorMisses() {
    return this.dataService.translatorMisses();
  }

  @Get('translator-miss-log')
  translatorMissLog(@Query('limit') limit = '100') {
    return this.dataService.translatorMissLog(Number(limit) || 100);
  }

  @Get(':table')
  browse(
    @Param('table') table: string,
    @Query('skip') skip = '0',
    @Query('take') take = '50',
  ) {
    return this.dataService.browse(table, Number(skip) || 0, Number(take) || 50);
  }

  @Post('bulk/reject-scrape-batch')
  @Superadmin()
  rejectScrapeBatch(@CurrentUser() user: RequestUser, @Body() dto: BulkRejectScrapeBatchDto) {
    return this.dataService.rejectScrapeBatch(dto, user.id);
  }

  @Post('bulk/reassign-region')
  @Superadmin()
  reassignRegion(@CurrentUser() user: RequestUser, @Body() dto: BulkReassignRegionDto) {
    return this.dataService.reassignRegion(dto, user.id);
  }

  @Post('lexicon/merge')
  @Superadmin()
  mergeLexicon(@CurrentUser() user: RequestUser, @Body() dto: MergeLexiconDto) {
    return this.dataService.mergeLexiconEntries(dto, user.id);
  }
}
