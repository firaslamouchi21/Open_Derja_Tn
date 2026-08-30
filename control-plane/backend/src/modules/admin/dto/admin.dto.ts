import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

const REGION_VALUES = ['northwest', 'north', 'sahel', 'south'];
const TASK_TYPE_VALUES = [
  'review',
  'region_tag',
  'confirm',
  'translate_msa',
  'translate_fr',
  'translate_en',
  'transliterate_to_arabic',
  'transliterate_to_arabizi',
  'standardise',
  'adjudicate',
  'link_lemma',
];

export class BulkRejectScrapeBatchDto {
  @IsUUID()
  documentId!: string;

  @IsInt()
  @Min(0)
  confirmCount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkReassignRegionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  corpusItemIds!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(REGION_VALUES, { each: true })
  regions!: string[];

  @IsInt()
  @Min(0)
  confirmCount!: number;
}

export class MergeLexiconDto {
  @IsUUID()
  sourceEntryId!: string;

  @IsUUID()
  targetEntryId!: string;
}

export class ResolveLaneItemDto {
  @IsIn(['accept', 'reject'])
  decision!: 'accept' | 'reject';
}

export class ReprioritiseTasksDto {
  @IsIn(TASK_TYPE_VALUES)
  type!: string;

  @IsOptional()
  @IsArray()
  @IsIn(REGION_VALUES, { each: true })
  targetRegions?: string[];

  @IsInt()
  priority!: number;
}

export class PauseTaskTypeDto {
  @IsIn(TASK_TYPE_VALUES)
  type!: string;
}

export class ReassignTaskDto {
  @IsUUID()
  userId!: string;
}

export class InviteReviewerDto {
  @IsString()
  email!: string;

  @IsIn(REGION_VALUES)
  region!: string;
}

export class BanUserWithRevertDto {
  @IsString()
  reason!: string;

  @IsInt()
  @Min(0)
  confirmCount!: number;
}

export class SetUserRoleDto {
  @IsIn(['contributor', 'trusted_contributor', 'reviewer', 'admin', 'superadmin'])
  role!: string;

  @IsString()
  reason!: string;
}

export class CreateSnapshotDto {
  @IsString()
  version!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeprecateSnapshotDto {
  @IsString()
  reason!: string;
}

export class CreateRevocationDto {
  @IsOptional()
  @IsUUID()
  subjectSessionId?: string;

  @IsOptional()
  @IsUUID()
  subjectUserId?: string;

  @IsIn(['text', 'voice', 'full'])
  scope!: 'text' | 'voice' | 'full';

  @IsIn(['REVOKE'])
  confirm!: string;
}

export class UpsertFeatureFlagDto {
  @IsString()
  key!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsIn(['public', 'reviewer'])
  audience!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SetMaintenanceDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  message?: string;
}
