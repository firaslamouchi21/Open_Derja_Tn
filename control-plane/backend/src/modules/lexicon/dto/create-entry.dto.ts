import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DOMAINS, GRANULARITIES, PARTS_OF_SPEECH } from '@open-derja/shared';
import type { Domain, Granularity, PartOfSpeech } from '@open-derja/db';

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
  @IsEnum(DOMAINS)
  domain?: Domain;

  @IsEnum(GRANULARITIES)
  granularity!: Granularity;

  @IsOptional()
  @IsEnum(PARTS_OF_SPEECH)
  pos?: PartOfSpeech;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
