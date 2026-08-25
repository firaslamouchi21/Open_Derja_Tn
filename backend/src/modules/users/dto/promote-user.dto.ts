import { IsEnum } from 'class-validator';
import type { Region } from '@open-derja/db';

const REGION_VALUES: Region[] = ['northwest', 'north', 'sahel', 'south'];

export class PromoteUserDto {
  @IsEnum(REGION_VALUES)
  regionSelfReported!: Region;
}
