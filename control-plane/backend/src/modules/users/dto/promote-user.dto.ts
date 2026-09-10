import { IsEnum } from 'class-validator';
import { REGIONS } from '@open-derja/shared';
import type { Region } from '@open-derja/db';

export class PromoteUserDto {
  @IsEnum(REGIONS)
  regionSelfReported!: Region;
}
