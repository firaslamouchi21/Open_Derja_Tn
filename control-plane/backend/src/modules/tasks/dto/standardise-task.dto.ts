import { IsString, MaxLength, MinLength } from 'class-validator';

export class StandardiseTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  canonicalForm!: string;
}
