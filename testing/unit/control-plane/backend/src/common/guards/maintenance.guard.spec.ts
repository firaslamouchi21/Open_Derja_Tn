import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MaintenanceGuard } from '../../../../../../../control-plane/backend/src/common/guards/maintenance.guard';

function makeContext(authHeader?: string, method = 'POST') {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: authHeader ? { authorization: authHeader } : {}, method }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never;
}

const tokenService = {
  verifyAccessToken: jest.fn(),
} as never;

function guardWith(enabled: boolean) {
  const systemSettings = {
    getMaintenanceMode: jest.fn().mockResolvedValue({ enabled, message: 'back soon' }),
  } as never;
  return new MaintenanceGuard(new Reflector(), tokenService, systemSettings);
}

describe('MaintenanceGuard', () => {
  afterEach(() => jest.clearAllMocks());

  it('passes everything through when maintenance mode is off', async () => {
    await expect(guardWith(false).canActivate(makeContext())).resolves.toBe(true);
  });

  it('blocks a normal request with 503 when maintenance mode is on', async () => {
    (tokenService as { verifyAccessToken: jest.Mock }).verifyAccessToken.mockRejectedValue(new Error('no token'));
    await expect(guardWith(true).canActivate(makeContext('Bearer x'))).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('lets a superadmin token through during maintenance', async () => {
    (tokenService as { verifyAccessToken: jest.Mock }).verifyAccessToken.mockResolvedValue({ role: 'superadmin' });
    await expect(guardWith(true).canActivate(makeContext('Bearer good'))).resolves.toBe(true);
  });
});
