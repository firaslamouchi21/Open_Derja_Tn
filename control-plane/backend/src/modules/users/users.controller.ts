import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { UserRole } from '@open-derja/db';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/guards/request-user.interface';
import { UsersService, type SafeUser } from './users.service';
import { PromoteUserDto } from './dto/promote-user.dto';
import { AdjustTrustDto } from './dto/adjust-trust.dto';
import { BanUserDto } from './dto/ban-user.dto';

@Controller('users')
@Roles('admin', 'superadmin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('role') role?: UserRole): Promise<SafeUser[]> {
    return this.usersService.findAll(role);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SafeUser> {
    return this.usersService.findOne(id);
  }

  @Post(':id/promote')
  promote(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PromoteUserDto,
  ): Promise<SafeUser> {
    return this.usersService.promoteToReviewer(id, dto, actor.id);
  }

  @Post(':id/trust')
  adjustTrust(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustTrustDto,
  ): Promise<SafeUser> {
    return this.usersService.adjustTrust(id, dto, actor.id);
  }

  @Post(':id/ban')
  ban(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BanUserDto,
  ): Promise<SafeUser> {
    return this.usersService.ban(id, dto, actor.id);
  }
}
