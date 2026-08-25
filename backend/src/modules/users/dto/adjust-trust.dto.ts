import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AdjustTrustDto {
  @IsInt()
  @Min(0)
  @Max(3)
  trustLevel!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}
