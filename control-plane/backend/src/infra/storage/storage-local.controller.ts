import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LocalStorageProvider, verifyLocalStorageToken } from '@open-derja/core';
import { Public } from '../../common/decorators/public.decorator';

@Controller('storage')
export class StorageLocalController {
  private readonly secret = process.env.STORAGE_LOCAL_SECRET;
  private readonly baseDir = process.env.STORAGE_LOCAL_DIR;

  private assertLocalMode(): void {
    if (process.env.STORAGE_PROVIDER !== 'local' || !this.secret || !this.baseDir) {
      throw new NotFoundException('Local storage endpoints are only served when STORAGE_PROVIDER=local');
    }
  }

  private verify(key: string, exp: string, sig: string): void {
    if (!verifyLocalStorageToken(key, Number(exp), sig, this.secret as string)) {
      throw new BadRequestException('Invalid or expired storage token');
    }
  }

  private path(key: string): string {
    return new LocalStorageProvider({
      baseDir: this.baseDir as string,
      baseUrl: '',
      secret: this.secret as string,
    }).resolvePath(key);
  }

  @Put('upload/:key')
  @Public()
  async upload(
    @Param('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Req() req: Request,
  ) {
    this.assertLocalMode();
    this.verify(key, exp, sig);
    const body = req.body;
    if (!Buffer.isBuffer(body)) {
      throw new BadRequestException('Upload body must be raw bytes');
    }
    const target = this.path(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
    return { stored: key, bytes: body.length };
  }

  @Get('download/:key')
  @Public()
  download(
    @Param('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    this.assertLocalMode();
    this.verify(key, exp, sig);
    createReadStream(this.path(key))
      .on('error', () => res.status(404).json({ error: 'Not found' }))
      .pipe(res);
  }
}
