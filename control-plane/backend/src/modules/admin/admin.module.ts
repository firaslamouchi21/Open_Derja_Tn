import { Module } from '@nestjs/common';
import { CorrectionsModule } from '../corrections/corrections.module';
import { FlagsModule } from '../flags/flags.module';
import { SourcesModule } from '../sources/sources.module';
import { UsersModule } from '../users/users.module';
import { OverviewController } from './overview/overview.controller';
import { OverviewService } from './overview/overview.service';
import { DataController } from './data/data.controller';
import { DataService } from './data/data.service';
import { ReviewLanesController } from './review-lanes/review-lanes.controller';
import { ReviewLanesService } from './review-lanes/review-lanes.service';
import { TaskAdminController } from './task-admin/task-admin.controller';
import { TaskAdminService } from './task-admin/task-admin.service';
import { SourcesAdminController } from './sources-admin/sources-admin.controller';
import { UsersAdminController } from './users-admin/users-admin.controller';
import { UsersAdminService } from './users-admin/users-admin.service';
import { SnapshotsController } from './snapshots/snapshots.controller';
import { SnapshotsService } from './snapshots/snapshots.service';
import { PrivacyController } from './privacy/privacy.controller';
import { PrivacyService } from './privacy/privacy.service';
import { SystemController } from './system/system.controller';
import { SystemService } from './system/system.service';

@Module({
  imports: [CorrectionsModule, FlagsModule, SourcesModule, UsersModule],
  controllers: [
    OverviewController,
    DataController,
    ReviewLanesController,
    TaskAdminController,
    SourcesAdminController,
    UsersAdminController,
    SnapshotsController,
    PrivacyController,
    SystemController,
  ],
  providers: [
    OverviewService,
    DataService,
    ReviewLanesService,
    TaskAdminService,
    UsersAdminService,
    SnapshotsService,
    PrivacyService,
    SystemService,
  ],
})
export class AdminModule {}
