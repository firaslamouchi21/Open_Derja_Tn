import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import { queuePasswordResetEmail, queueVerificationEmail } from '@open-derja/core';
import type { OtpPurpose, Prisma } from '@open-derja/db';
import { PrismaService } from '../database/prisma.service';

const TTL_MS: Record<OtpPurpose, number> = {
  email_verify: 15 * 60 * 1000,
  password_reset: 20 * 60 * 1000,
};
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

@Injectable()
export class EmailOtpService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(
    params: { userId: string; email: string; purpose: OtpPurpose },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const latest = await client.emailOtp.findFirst({
      where: { userId: params.userId, purpose: params.purpose },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new BadRequestException('A code was just sent — wait a minute before requesting another');
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await client.emailOtp.create({
      data: {
        userId: params.userId,
        purpose: params.purpose,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + TTL_MS[params.purpose]),
      },
    });

    if (params.purpose === 'email_verify') {
      await queueVerificationEmail(client, { email: params.email, code });
    } else {
      await queuePasswordResetEmail(client, { email: params.email, code });
    }
  }

  async consume(userId: string, purpose: OtpPurpose, code: string): Promise<void> {
    const otp = await this.prisma.emailOtp.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('Code is invalid or has expired');
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      await this.prisma.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
      throw new BadRequestException('Too many attempts — request a new code');
    }

    const claimed = await this.prisma.emailOtp.updateMany({
      where: { id: otp.id, consumedAt: null, codeHash: hashCode(code) },
      data: { consumedAt: new Date() },
    });
    if (claimed.count === 0) {
      await this.prisma.emailOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Incorrect code');
    }
  }
}
