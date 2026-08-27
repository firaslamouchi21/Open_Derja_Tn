import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { PrismaModule } from './infra/database/prisma.module';
import { TokenModule } from './infra/auth/token.module';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TrustGuard } from './common/guards/trust.guard';
import { AuthModule } from './infra/auth/auth.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CorpusItemsModule } from './modules/corpus-items/corpus-items.module';
import { LexiconModule } from './modules/lexicon/lexicon.module';
import { TranslateModule } from './modules/translate/translate.module';
import { SourcesModule } from './modules/sources/sources.module';
import { CorrectionsModule } from './modules/corrections/corrections.module';
import { FlagsModule } from './modules/flags/flags.module';
import { UsersModule } from './modules/users/users.module';
import { HealthController } from './health-check';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '../../.env'),
    }),
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
    LexiconModule,
    TranslateModule,
    SourcesModule,
    CorrectionsModule,
    FlagsModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TrustGuard },
  ],
})
export class AppModule {}
