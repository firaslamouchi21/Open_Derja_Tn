import { BadRequestException } from '@nestjs/common';
import * as core from '@open-derja/core';
import { EmailOtpService } from '../../../../../../../control-plane/backend/src/infra/auth/email-otp.service';

jest.mock(
  '@open-derja/core',
  () => ({
    queuePasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    queueVerificationEmail: jest.fn().mockResolvedValue(undefined),
  }),
  { virtual: true },
);

const mockedCore = core as jest.Mocked<typeof core>;

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    emailOtp: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    ...overrides,
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('EmailOtpService.issue', () => {
  it('queues a verification email and stores a hashed code, never the raw code', async () => {
    const prisma = makePrisma();
    const service = new EmailOtpService(prisma);

    await service.issue({ userId: 'u1', email: 'a@b.com', purpose: 'email_verify' });

    expect(prisma.emailOtp.create).toHaveBeenCalledTimes(1);
    const created = prisma.emailOtp.create.mock.calls[0][0].data;
    expect(created.codeHash).toHaveLength(64);
    expect(mockedCore.queueVerificationEmail).toHaveBeenCalledWith(prisma, expect.objectContaining({ email: 'a@b.com' }));
    expect(mockedCore.queuePasswordResetEmail).not.toHaveBeenCalled();
  });

  it('queues a password-reset email for that purpose instead', async () => {
    const prisma = makePrisma();
    const service = new EmailOtpService(prisma);

    await service.issue({ userId: 'u1', email: 'a@b.com', purpose: 'password_reset' });

    expect(mockedCore.queuePasswordResetEmail).toHaveBeenCalled();
    expect(mockedCore.queueVerificationEmail).not.toHaveBeenCalled();
  });

  it('rejects a second request inside the resend cooldown window', async () => {
    const prisma = makePrisma();
    prisma.emailOtp.findFirst.mockResolvedValue({ createdAt: new Date() });
    const service = new EmailOtpService(prisma);

    await expect(service.issue({ userId: 'u1', email: 'a@b.com', purpose: 'email_verify' })).rejects.toThrow(BadRequestException);
    expect(prisma.emailOtp.create).not.toHaveBeenCalled();
  });

  it('allows a new request once the cooldown window has passed', async () => {
    const prisma = makePrisma();
    prisma.emailOtp.findFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 61_000) });
    const service = new EmailOtpService(prisma);

    await expect(service.issue({ userId: 'u1', email: 'a@b.com', purpose: 'email_verify' })).resolves.toBeUndefined();
    expect(prisma.emailOtp.create).toHaveBeenCalled();
  });
});

describe('EmailOtpService.consume', () => {
  it('rejects when no pending code exists', async () => {
    const prisma = makePrisma();
    const service = new EmailOtpService(prisma);

    await expect(service.consume('u1', 'email_verify', '123456')).rejects.toThrow(BadRequestException);
  });

  it('rejects an expired code', async () => {
    const prisma = makePrisma();
    prisma.emailOtp.findFirst.mockResolvedValue({ id: 'otp1', expiresAt: new Date(Date.now() - 1000), attempts: 0 });
    const service = new EmailOtpService(prisma);

    await expect(service.consume('u1', 'email_verify', '123456')).rejects.toThrow(BadRequestException);
  });

  it('locks the code out after too many attempts, even with the right code', async () => {
    const prisma = makePrisma();
    prisma.emailOtp.findFirst.mockResolvedValue({ id: 'otp1', expiresAt: new Date(Date.now() + 60_000), attempts: 5 });
    const service = new EmailOtpService(prisma);

    await expect(service.consume('u1', 'email_verify', '123456')).rejects.toThrow(BadRequestException);
    expect(prisma.emailOtp.update).toHaveBeenCalledWith({ where: { id: 'otp1' }, data: { consumedAt: expect.any(Date) } });
  });

  it('increments attempts and rejects on a wrong code', async () => {
    const prisma = makePrisma();
    prisma.emailOtp.findFirst.mockResolvedValue({ id: 'otp1', expiresAt: new Date(Date.now() + 60_000), attempts: 0 });
    prisma.emailOtp.updateMany.mockResolvedValue({ count: 0 });
    const service = new EmailOtpService(prisma);

    await expect(service.consume('u1', 'email_verify', 'wrong')).rejects.toThrow(BadRequestException);
    expect(prisma.emailOtp.update).toHaveBeenCalledWith({ where: { id: 'otp1' }, data: { attempts: { increment: 1 } } });
  });

  it('accepts a correct code and marks it consumed exactly once', async () => {
    const prisma = makePrisma();
    prisma.emailOtp.findFirst.mockResolvedValue({ id: 'otp1', expiresAt: new Date(Date.now() + 60_000), attempts: 0 });
    prisma.emailOtp.updateMany.mockResolvedValue({ count: 1 });
    const service = new EmailOtpService(prisma);

    await expect(service.consume('u1', 'email_verify', '123456')).resolves.toBeUndefined();
    expect(prisma.emailOtp.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'otp1', consumedAt: null }) }),
    );
  });
});
