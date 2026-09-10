import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as core from '@open-derja/core';
import { TotpService } from '../../../../../../../control-plane/backend/src/infra/auth/totp.service';

jest.mock(
  '@open-derja/core',
  () => ({
    generateTotpSecret: jest.fn(),
    totpAuthUri: jest.fn(),
    verifyTotp: jest.fn(),
  }),
  { virtual: true },
);

const mockedCore = core as jest.Mocked<typeof core>;

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: { findUnique: jest.fn(), update: jest.fn() },
    ...overrides,
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('TotpService.beginEnrollment', () => {
  it('throws when the user does not exist', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new TotpService(prisma);

    await expect(service.beginEnrollment('ghost')).rejects.toThrow(NotFoundException);
  });

  it('refuses to re-enroll an account that already has 2FA enabled', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpEnabled: true });
    const service = new TotpService(prisma);

    await expect(service.beginEnrollment('u1')).rejects.toThrow(BadRequestException);
  });

  it('generates and stores a new secret, returning it with an otpauth URL', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpEnabled: false, email: 'a@b.com' });
    mockedCore.generateTotpSecret.mockReturnValue('SECRET123');
    mockedCore.totpAuthUri.mockReturnValue('otpauth://totp/x');
    const service = new TotpService(prisma);

    const result = await service.beginEnrollment('u1');

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { totpSecret: 'SECRET123' } });
    expect(mockedCore.totpAuthUri).toHaveBeenCalledWith('SECRET123', 'a@b.com');
    expect(result).toEqual({ secret: 'SECRET123', otpauthUrl: 'otpauth://totp/x' });
  });

  it('falls back to the user id for the otpauth label when there is no email', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpEnabled: false, email: null });
    mockedCore.generateTotpSecret.mockReturnValue('SECRET123');
    const service = new TotpService(prisma);

    await service.beginEnrollment('u1');

    expect(mockedCore.totpAuthUri).toHaveBeenCalledWith('SECRET123', 'u1');
  });
});

describe('TotpService.confirmEnrollment', () => {
  it('rejects when enrollment was never started', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpSecret: null });
    const service = new TotpService(prisma);

    await expect(service.confirmEnrollment('u1', '123456')).rejects.toThrow(BadRequestException);
  });

  it('rejects an incorrect code without enabling 2FA', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpSecret: 'SECRET' });
    mockedCore.verifyTotp.mockReturnValue(false);
    const service = new TotpService(prisma);

    await expect(service.confirmEnrollment('u1', '000000')).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('enables 2FA on a correct code', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpSecret: 'SECRET' });
    mockedCore.verifyTotp.mockReturnValue(true);
    const service = new TotpService(prisma);

    await service.confirmEnrollment('u1', '123456');

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { totpEnabled: true } });
  });
});

describe('TotpService.assertCode (optional 2FA — used by password login, which pre-checks totpEnabled)', () => {
  it('silently passes for an account with no 2FA enrolled', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpEnabled: false, totpSecret: null });
    const service = new TotpService(prisma);

    await expect(service.assertCode('u1', undefined)).resolves.toBeUndefined();
  });

  it('requires a valid code once 2FA is enrolled', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpEnabled: true, totpSecret: 'SECRET' });
    mockedCore.verifyTotp.mockReturnValue(false);
    const service = new TotpService(prisma);

    await expect(service.assertCode('u1', '000000')).rejects.toThrow(BadRequestException);
  });

  it('passes with a correct code once 2FA is enrolled', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpEnabled: true, totpSecret: 'SECRET' });
    mockedCore.verifyTotp.mockReturnValue(true);
    const service = new TotpService(prisma);

    await expect(service.assertCode('u1', '123456')).resolves.toBeUndefined();
  });
});

describe('TotpService.requireEnrolledCode (mandatory 2FA verify — closes the bypass assertCode would allow)', () => {
  it('rejects rather than silently passing when 2FA was never enrolled', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpEnabled: false, totpSecret: null });
    const service = new TotpService(prisma);

    await expect(service.requireEnrolledCode('u1', undefined)).rejects.toThrow(BadRequestException);
  });

  it('rejects an incorrect code for an enrolled account', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpEnabled: true, totpSecret: 'SECRET' });
    mockedCore.verifyTotp.mockReturnValue(false);
    const service = new TotpService(prisma);

    await expect(service.requireEnrolledCode('u1', '000000')).rejects.toThrow(BadRequestException);
  });

  it('passes with a correct code for an enrolled account', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', totpEnabled: true, totpSecret: 'SECRET' });
    mockedCore.verifyTotp.mockReturnValue(true);
    const service = new TotpService(prisma);

    await expect(service.requireEnrolledCode('u1', '123456')).resolves.toBeUndefined();
  });
});
