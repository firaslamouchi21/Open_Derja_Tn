import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import type { Region } from '@open-derja/db';

const REGION_VALUES: Region[] = ['northwest', 'north', 'sahel', 'south'];

export class ConfirmTaskDto {
  @IsBoolean()
  agrees!: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(4)
  @IsEnum(REGION_VALUES, { each: true })
  regions?: Region[];
}
