import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import type { License } from '@open-derja/db';

const LICENSE_VALUES: License[] = ['cc_by_sa', 'cc_by_nc', 'research_use_only', 'public_domain', 'unknown'];

export class UpdateSourceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsEnum(LICENSE_VALUES)
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
