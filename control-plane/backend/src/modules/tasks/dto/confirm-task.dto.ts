import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { REGIONS } from '@open-derja/shared';
import type { Region } from '@open-derja/db';

export class ConfirmTaskDto {
  @IsBoolean()
  agrees!: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(4)
  @IsEnum(REGIONS, { each: true })
  regions?: Region[];
}
