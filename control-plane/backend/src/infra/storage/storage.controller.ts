import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import type { StoredObjectKind } from '@open-derja/db';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/guards/request-user.interface';
import { StorageService } from './storage.service';
import { IssueUploadDto } from './dto/issue-upload.dto';

@Controller('storage/uploads')
@Roles('reviewer', 'admin', 'superadmin')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  issue(@CurrentUser() user: RequestUser, @Body() dto: IssueUploadDto) {
    return this.storageService.issueUpload({
      kind: dto.kind as StoredObjectKind,
      mimeType: dto.mimeType,
      uploadedBy: user.id,
    });
  }

  @Post(':id/confirm')
  confirm(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.storageService.confirmUpload(id, user.id);
  }

  @Get(':id/download')
  download(@Param('id', ParseUUIDPipe) id: string) {
    return this.storageService.issueDownload(id);
  }
}
