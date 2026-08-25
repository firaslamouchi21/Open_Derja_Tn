import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import type { License, SourceKind } from '@open-derja/db';

const SOURCE_KIND_VALUES: SourceKind[] = [
  'youtube',
  'forum',
  'book',
  'subtitle',
  'contribution',
  'elicitation',
  'wikipedia',
  'commoncrawl',
  'tatoeba',
];

const LICENSE_VALUES: License[] = ['cc_by_sa', 'cc_by_nc', 'research_use_only', 'public_domain', 'unknown'];

export class CreateSourceDto {
  @IsEnum(SOURCE_KIND_VALUES)
  kind!: SourceKind;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsEnum(LICENSE_VALUES)
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
