import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ProposeCorrectionDto {
  @IsString()
  @MaxLength(100)
  targetTable!: string;

  @IsUUID()
  targetId!: string;

  @IsString()
  @MaxLength(100)
  field!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  oldValue?: string;

  @IsString()
  @MaxLength(2000)
  newValue!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
