import { IsEnum, IsString, MaxLength } from 'class-validator';
import type { Script } from '@open-derja/db';

const SCRIPT_VALUES: Script[] = ['arabic', 'arabizi', 'mixed', 'latin'];

export class CreateLexiconFormDto {
  @IsString()
  @MaxLength(500)
  text!: string;

  @IsEnum(SCRIPT_VALUES)
  script!: Script;
}
