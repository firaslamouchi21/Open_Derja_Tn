import { Module } from '@nestjs/common';
import { LexiconController } from './lexicon.controller';
import { LexiconService } from './lexicon.service';

@Module({
  controllers: [LexiconController],
  providers: [LexiconService],
  exports: [LexiconService],
})
export class LexiconModule {}
