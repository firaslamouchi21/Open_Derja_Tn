import { ArrayMinSize, IsArray, IsEnum, IsString } from 'class-validator';
import { TAG_KINDS } from '@open-derja/shared';
import type { TagKind } from '@open-derja/db';

export class AdjudicateTaskDto {
  @IsEnum(TAG_KINDS)
  kind!: TagKind;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  values!: string[];
}
