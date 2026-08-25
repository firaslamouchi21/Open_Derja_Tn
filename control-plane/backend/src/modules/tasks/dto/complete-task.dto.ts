import { IsOptional, IsUUID } from 'class-validator';

export class CompleteTaskDto {
  @IsOptional()
  @IsUUID()
  outputRecordId?: string;
}
