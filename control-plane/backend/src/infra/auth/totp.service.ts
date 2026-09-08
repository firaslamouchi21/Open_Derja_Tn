import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { generateTotpSecret, totpAuthUri, verifyTotp } from '@open-derja/core';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TotpService {
  constructor(private readonly prisma: PrismaService) {}

  async beginEnrollment(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.totpEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }
    const secret = generateTotpSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });
    return { secret, otpauthUrl: totpAuthUri(secret, user.email ?? user.id) };
  }

  async confirmEnrollment(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) {
      throw new BadRequestException('Start enrollment first');
    }
    if (!verifyTotp(user.totpSecret, code)) {
      throw new BadRequestException('Incorrect code');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
  }

  async assertCode(userId: string, code: string | undefined): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret || !user.totpEnabled) {
      return;
    }
    if (!code || !verifyTotp(user.totpSecret, code)) {
      throw new BadRequestException('A valid two-factor code is required');
    }
  }

  async requireEnrolledCode(userId: string, code: string | undefined): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret || !user.totpEnabled) {
      throw new BadRequestException('Two-factor authentication has not been enrolled for this account');
    }
    if (!code || !verifyTotp(user.totpSecret, code)) {
      throw new BadRequestException('Incorrect code');
    }
  }
}
