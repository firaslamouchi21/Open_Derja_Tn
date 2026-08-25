import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { OriginLayer } from '@open-derja/db';

const ORIGIN_VALUES: OriginLayer[] = [
  'arabic',
  'arabic_derived',
  'french',
  'amazigh',
  'italian',
  'turkish',
  'spanish',
  'other',
  'unknown',
];

export class AddOriginDto {
  @IsEnum(ORIGIN_VALUES)
  origin!: OriginLayer;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourceForm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceLang?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
