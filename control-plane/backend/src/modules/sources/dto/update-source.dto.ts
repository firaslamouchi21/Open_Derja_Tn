import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { LICENSES } from '@open-derja/shared';
import type { License } from '@open-derja/db';

export class UpdateSourceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsEnum(LICENSES)
  licenseDefault?: License;

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
