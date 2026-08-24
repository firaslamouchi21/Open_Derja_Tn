import { Module } from '@nestjs/common';
import { CorpusItemsController } from './corpus-items.controller';
import { CorpusItemsService } from './corpus-items.service';

@Module({
  controllers: [CorpusItemsController],
  providers: [CorpusItemsService],
})
export class CorpusItemsModule {}
