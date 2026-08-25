import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class TransliterateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;

  @IsUUID()
  lexiconVariantId!: string;
}
