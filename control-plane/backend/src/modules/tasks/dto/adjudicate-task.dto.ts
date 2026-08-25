import { ArrayMinSize, IsArray, IsEnum, IsString } from 'class-validator';
import type { TagKind } from '@open-derja/db';

const TAG_KIND_VALUES: TagKind[] = [
  'scope',
  'region',
  'era',
  'setting',
  'register',
  'code_switch',
  'sense',
  'quality',
];

export class AdjudicateTaskDto {
  @IsEnum(TAG_KIND_VALUES)
  kind!: TagKind;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  values!: string[];
}
