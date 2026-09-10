import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { FLAG_REASONS } from '@open-derja/shared';
import type { FlagReason } from '@open-derja/db';

export class CreateFlagDto {
  @IsString()
  @MaxLength(100)
  targetType!: string;

  @IsUUID()
  targetId!: string;

  @IsEnum(FLAG_REASONS)
  reason!: FlagReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
