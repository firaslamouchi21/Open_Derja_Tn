import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { REGIONS } from '@open-derja/shared';
import type { Region } from '@open-derja/db';

export class TranslateQueryDto {
  @IsString()
  @MaxLength(1000)
  text!: string;

  @IsOptional()
  @IsEnum(REGIONS)
  region?: Region;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeVulgar?: boolean;
}
