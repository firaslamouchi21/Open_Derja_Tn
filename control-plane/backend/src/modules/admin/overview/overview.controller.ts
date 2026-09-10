import { Controller, Get } from '@nestjs/common';
import { AdminArea } from '../../../common/decorators/admin-area.decorator';
import { OverviewService } from './overview.service';

@Controller('admin/overview')
@AdminArea()
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  overview() {
    return this.overviewService.overview();
  }
}
