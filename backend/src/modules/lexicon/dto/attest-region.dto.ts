import { IsEnum } from 'class-validator';
import type { Region } from '@open-derja/db';

const REGION_VALUES: Region[] = ['northwest', 'north', 'sahel', 'south'];

export class AttestRegionDto {
  @IsEnum(REGION_VALUES)
  region!: Region;
}
