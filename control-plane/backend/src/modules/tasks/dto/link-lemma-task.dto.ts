import { IsOptional, IsUUID } from 'class-validator';

export class LinkLemmaTaskDto {
  @IsUUID()
  lexiconEntryId!: string;

  @IsOptional()
  @IsUUID()
  lexiconVariantId?: string;
}
