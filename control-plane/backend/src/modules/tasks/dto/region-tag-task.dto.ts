import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { REGIONS } from '@open-derja/shared';
import type { Region } from '@open-derja/db';

export class RegionTagTaskDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(4)
  @IsEnum(REGIONS, { each: true })
  regions!: Region[];
}
