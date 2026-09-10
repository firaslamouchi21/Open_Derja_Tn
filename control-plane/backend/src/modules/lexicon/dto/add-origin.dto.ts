import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ORIGIN_LAYERS } from '@open-derja/shared';
import type { OriginLayer } from '@open-derja/db';

export class AddOriginDto {
  @IsEnum(ORIGIN_LAYERS)
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
