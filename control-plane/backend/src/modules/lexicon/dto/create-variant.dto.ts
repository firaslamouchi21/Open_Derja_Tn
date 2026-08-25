import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Era, Register, Scope, Setting } from '@open-derja/db';

const SCOPE_VALUES: Scope[] = ['pan_tunisian', 'regional'];
const ERA_VALUES: Era[] = ['contemporary', 'historical', 'unknown'];
const SETTING_VALUES: Setting[] = ['urban', 'rural', 'unknown'];
const REGISTER_VALUES: Register[] = ['neutral', 'formal', 'vulgar', 'archaic', 'unknown'];

export class CreateLexiconVariantDto {
  @IsEnum(SCOPE_VALUES)
  scope!: Scope;

  @IsEnum(ERA_VALUES)
  era!: Era;

  @IsEnum(SETTING_VALUES)
  setting!: Setting;

  @IsEnum(REGISTER_VALUES)
  register!: Register;

  @IsString()
  @MaxLength(500)
  canonicalForm!: string;
}
