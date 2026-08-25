import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Region } from '@open-derja/db';

const REGION_VALUES: Region[] = ['northwest', 'north', 'sahel', 'south'];

export class TranslateQueryDto {
  @IsString()
  @MaxLength(1000)
  text!: string;

  @IsOptional()
  @IsEnum(REGION_VALUES)
  region?: Region;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeVulgar?: boolean;
}
