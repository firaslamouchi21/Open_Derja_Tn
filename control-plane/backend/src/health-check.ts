import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './infra/database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }
    return { status: 'ok' };
  }
}
