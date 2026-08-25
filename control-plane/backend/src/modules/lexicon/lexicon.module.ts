import { Module } from '@nestjs/common';
import { LexiconController } from './lexicon.controller';

@Module({
  controllers: [LexiconController],
})
export class LexiconModule {}
