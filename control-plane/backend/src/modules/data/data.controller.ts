import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { DataService } from './data.service';

@Controller('data')
export class DataController {
  constructor(private readonly service: DataService) {}

  @Get()
  @Public()
  list() {
    return this.service.list();
  }

  @Get(':id/download')
  @Public()
  download(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.download(id);
  }
}
