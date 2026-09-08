import { Injectable } from '@nestjs/common';
import { getCoverage, getGaps, getLeaderboard, type CoverageReport, type GapsReport, type LeaderboardEntry } from '@open-derja/core';
import { PrismaService } from '../../infra/database/prisma.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@Injectable()
export class PublicStatsService {
  constructor(private readonly prisma: PrismaService) {}

  leaderboard(query: LeaderboardQueryDto): Promise<LeaderboardEntry[]> {
    return getLeaderboard(this.prisma, query.region, query.limit);
  }

  coverage(): Promise<CoverageReport> {
    return getCoverage(this.prisma);
  }

  gaps(): Promise<GapsReport> {
    return getGaps(this.prisma);
  }
}
