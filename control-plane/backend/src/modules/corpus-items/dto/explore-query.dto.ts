import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CORPUS_UNITS, ERAS, REGIONS, REGISTERS, SCOPES, SCRIPTS, SETTINGS } from '@open-derja/shared';
import type { CorpusUnit, Era, Region, Register, Scope, Script, Setting } from '@open-derja/db';

export class ExploreQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  q?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(REGIONS, { each: true })
  regions?: Region[];

  @IsOptional()
  @IsEnum(SCOPES)
  scope?: Scope;

  @IsOptional()
  @IsEnum(ERAS)
  era?: Era;

  @IsOptional()
  @IsEnum(SETTINGS)
  setting?: Setting;

  @IsOptional()
  @IsEnum(REGISTERS)
  register?: Register;

  @IsOptional()
  @IsEnum(SCRIPTS)
  script?: Script;

  @IsOptional()
  @IsEnum(CORPUS_UNITS)
  unit?: CorpusUnit;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasTranslation?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
