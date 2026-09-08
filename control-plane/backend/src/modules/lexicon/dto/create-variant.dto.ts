import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ERAS, REGISTERS, SCOPES, SETTINGS } from '@open-derja/shared';
import type { Era, Register, Scope, Setting } from '@open-derja/db';

export class CreateLexiconVariantDto {
  @IsEnum(SCOPES)
  scope!: Scope;

  @IsEnum(ERAS)
  era!: Era;

  @IsEnum(SETTINGS)
  setting!: Setting;

  @IsEnum(REGISTERS)
  register!: Register;

  @IsString()
  @MaxLength(500)
  canonicalForm!: string;
}
