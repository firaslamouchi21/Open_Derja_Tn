import { IsIn, IsOptional, IsString } from 'class-validator';

const UPLOADABLE_KINDS = ['book_scan', 'other'];

export class IssueUploadDto {
  @IsIn(UPLOADABLE_KINDS)
  kind!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
