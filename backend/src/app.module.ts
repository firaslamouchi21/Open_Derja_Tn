import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { PrismaModule } from './infra/database/prisma.module';
import { TokenModule } from './infra/auth/token.module';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TrustGuard } from './common/guards/trust.guard';
import { AuthModule } from './infra/auth/auth.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CorpusItemsModule } from './modules/corpus-items/corpus-items.module';
import { HealthController } from './health-check';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
          throw new Error('REDIS_URL must be set — rate limiting requires shared Redis-backed storage, never in-memory');
        }
        return {
          throttlers: [{ ttl: 60_000, limit: 100 }],
          storage: new ThrottlerStorageRedisService(redisUrl),
        };
      },
    }),
    PrismaModule,
    TokenModule,
    AuthModule,
    TasksModule,
    CorpusItemsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TrustGuard },
  ],
})
export class AppModule {}
