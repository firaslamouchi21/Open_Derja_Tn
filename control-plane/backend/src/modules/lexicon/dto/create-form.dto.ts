import { IsEnum, IsString, MaxLength } from 'class-validator';
import { SCRIPTS } from '@open-derja/shared';
import type { Script } from '@open-derja/db';

export class CreateLexiconFormDto {
  @IsString()
  @MaxLength(500)
  text!: string;

  @IsEnum(SCRIPTS)
  script!: Script;
}
