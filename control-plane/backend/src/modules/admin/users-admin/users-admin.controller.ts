import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { UserRole } from '@open-derja/db';
import { AdminArea } from '../../../common/decorators/admin-area.decorator';
import { Superadmin } from '../../../common/decorators/superadmin.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/guards/request-user.interface';
import { UsersService } from '../../users/users.service';
import { UsersAdminService } from './users-admin.service';
import {
  BanUserWithRevertDto,
  InviteReviewerDto,
  SetUserRoleDto,
} from '../dto/admin.dto';
import { PromoteUserDto } from '../../users/dto/promote-user.dto';
import { AdjustTrustDto } from '../../users/dto/adjust-trust.dto';

@Controller('admin/users')
@AdminArea()
export class UsersAdminController {
  constructor(
    private readonly users: UsersService,
    private readonly usersAdmin: UsersAdminService,
  ) {}

  @Get()
  list(@Query('role') role?: UserRole) {
    return this.users.findAll(role);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Get(':id/quality')
  quality(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersAdmin.quality(id);
  }

  @Post('invite-reviewer')
  inviteReviewer(@CurrentUser() user: RequestUser, @Body() dto: InviteReviewerDto) {
    return this.usersAdmin.inviteReviewer(dto, user.id);
  }

  @Post(':id/promote')
  promote(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PromoteUserDto,
  ) {
    return this.users.promoteToReviewer(id, dto, user.id);
  }

  @Post(':id/trust')
  adjustTrust(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustTrustDto,
  ) {
    return this.users.adjustTrust(id, dto, user.id);
  }

  @Post(':id/ban')
  ban(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BanUserWithRevertDto,
  ) {
    return this.usersAdmin.banWithRevert(id, dto, user.id);
  }

  @Post(':id/role')
  @Superadmin()
  setRole(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserRoleDto,
  ) {
    return this.usersAdmin.setRole(id, dto, user.id);
  }
}
