import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { FlagReason } from '@open-derja/db';

const FLAG_REASON_VALUES: FlagReason[] = ['offensive', 'personal_data', 'wrong', 'copyright', 'other'];

export class CreateFlagDto {
  @IsString()
  @MaxLength(100)
  targetType!: string;

  @IsUUID()
  targetId!: string;

  @IsEnum(FLAG_REASON_VALUES)
  reason!: FlagReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
