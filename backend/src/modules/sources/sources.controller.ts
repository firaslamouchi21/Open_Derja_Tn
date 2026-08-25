import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import type { Source } from '@open-derja/db';
import { Roles } from '../../common/decorators/roles.decorator';
import { SourcesService } from './sources.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';

@Controller('sources')
@Roles('admin', 'superadmin')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  findAll(): Promise<Source[]> {
    return this.sourcesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Source> {
    return this.sourcesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSourceDto): Promise<Source> {
    return this.sourcesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSourceDto): Promise<Source> {
    return this.sourcesService.update(id, dto);
  }

  @Post(':id/disable')
  disable(@Param('id', ParseUUIDPipe) id: string): Promise<Source> {
    return this.sourcesService.disable(id);
  }
}
