import { Module } from '@nestjs/common';
import { AnnotationsModule } from '../annotations/annotations.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [AnnotationsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
