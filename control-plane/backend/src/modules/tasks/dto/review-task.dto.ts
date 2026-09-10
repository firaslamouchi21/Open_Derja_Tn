import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { REGIONS } from '@open-derja/shared';
import type { Region } from '@open-derja/db';

export class ReviewTaskDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  qualityValue?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(4)
  @IsEnum(REGIONS, { each: true })
  regions?: Region[];
}
