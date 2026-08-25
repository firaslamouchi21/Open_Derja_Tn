import { IsString, MaxLength, MinLength } from 'class-validator';

export class TranslateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;
}
