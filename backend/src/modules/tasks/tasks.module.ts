import { Module } from '@nestjs/common';
import { AnnotationsModule } from '../annotations/annotations.module';
import { LexiconModule } from '../lexicon/lexicon.module';
import { TranslateModule } from '../translate/translate.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [AnnotationsModule, LexiconModule, TranslateModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
