import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Domain, Granularity, PartOfSpeech } from '@open-derja/db';

const DOMAIN_VALUES: Domain[] = ['everyday', 'food', 'admin', 'agriculture', 'kinship', 'other'];
const GRANULARITY_VALUES: Granularity[] = ['word', 'phrase', 'sentence'];
const POS_VALUES: PartOfSpeech[] = ['noun', 'verb', 'adj', 'particle'];

export class CreateLexiconEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  glossEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  glossFr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  glossMsa?: string;

  @IsOptional()
  @IsEnum(DOMAIN_VALUES)
  domain?: Domain;

  @IsEnum(GRANULARITY_VALUES)
  granularity!: Granularity;

  @IsOptional()
  @IsEnum(POS_VALUES)
  pos?: PartOfSpeech;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
