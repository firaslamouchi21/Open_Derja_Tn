import { IsEnum } from 'class-validator';
import { REGIONS } from '@open-derja/shared';
import type { Region } from '@open-derja/db';

export class AttestRegionDto {
  @IsEnum(REGIONS)
  region!: Region;
}
