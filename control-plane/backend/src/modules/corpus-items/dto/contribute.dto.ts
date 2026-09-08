import { Equals, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { REGIONS } from '@open-derja/shared';
import type { Region } from '@open-derja/db';

export class ContributeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;

  @IsOptional()
  @IsEnum(REGIONS)
  selfReportedRegion?: Region;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  selfReportedOrigin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contributorName?: string;

  @IsOptional()
  @IsEmail()
  contributorEmail?: string;

  @Equals(true, { message: 'consentGiven must be true to submit' })
  consentGiven!: boolean;

  @IsOptional()
  @IsBoolean()
  consentVoice?: boolean;
}
