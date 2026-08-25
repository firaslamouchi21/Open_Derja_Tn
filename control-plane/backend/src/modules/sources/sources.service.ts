import { Injectable, NotFoundException } from '@nestjs/common';
import type { Source } from '@open-derja/db';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Source[]> {
    return this.prisma.source.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<Source> {
    const source = await this.prisma.source.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException('Source not found');
    }
    return source;
  }

  create(dto: CreateSourceDto): Promise<Source> {
    return this.prisma.source.create({
      data: {
        kind: dto.kind,
        name: dto.name,
        url: dto.url,
        licenseDefault: dto.licenseDefault,
        active: dto.active ?? true,
        rateLimit: dto.rateLimit,
        proxyPool: dto.proxyPool,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateSourceDto): Promise<Source> {
    await this.findOne(id);
    return this.prisma.source.update({ where: { id }, data: dto });
  }

  async disable(id: string): Promise<Source> {
    await this.findOne(id);
    return this.prisma.source.update({ where: { id }, data: { active: false } });
  }
}
