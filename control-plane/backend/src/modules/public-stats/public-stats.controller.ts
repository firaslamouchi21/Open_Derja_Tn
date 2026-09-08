import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PublicStatsService } from './public-stats.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@Controller()
export class PublicStatsController {
  constructor(private readonly publicStats: PublicStatsService) {}

  @Get('contributors')
  @Public()
  leaderboard(@Query() query: LeaderboardQueryDto) {
    return this.publicStats.leaderboard(query);
  }

  @Get('coverage')
  @Public()
  coverage() {
    return this.publicStats.coverage();
  }

  @Get('gaps')
  @Public()
  gaps() {
    return this.publicStats.gaps();
  }
}
