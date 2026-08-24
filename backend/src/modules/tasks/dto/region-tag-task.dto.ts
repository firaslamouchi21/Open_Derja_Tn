import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsEnum } from 'class-validator';
import type { Region } from '@open-derja/db';

const REGION_VALUES: Region[] = ['northwest', 'north', 'sahel', 'south'];

export class RegionTagTaskDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(4)
  @IsEnum(REGION_VALUES, { each: true })
  regions!: Region[];
}
