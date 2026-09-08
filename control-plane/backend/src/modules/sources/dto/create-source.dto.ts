import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { LICENSES, SOURCE_KINDS } from '@open-derja/shared';
import type { License, SourceKind } from '@open-derja/db';

export class CreateSourceDto {
  @IsEnum(SOURCE_KINDS)
  kind!: SourceKind;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsEnum(LICENSES)
  licenseDefault!: License;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  rateLimit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  proxyPool?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
