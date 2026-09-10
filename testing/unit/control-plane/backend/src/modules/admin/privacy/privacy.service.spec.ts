import { BadRequestException } from '@nestjs/common';
import * as core from '@open-derja/core';
import { PrivacyService } from '../../../../../../../../control-plane/backend/src/modules/admin/privacy/privacy.service';

jest.mock(
  '@open-derja/core',
  () => ({
    writeAuditLog: jest.fn().mockResolvedValue(undefined),
    previewRevocationScrub: jest.fn(),
  }),
  { virtual: true },
);
const mockedCore = core as jest.Mocked<typeof core>;

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    consentRevocation: { create: jest.fn().mockResolvedValue({ id: 'rev-1', status: 'pending' }), findMany: jest.fn().mockResolvedValue([]) },
    submissionMeta: { findMany: jest.fn().mockResolvedValue([]) },
    contributorStats: { findUnique: jest.fn().mockResolvedValue(null) },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    lexiconOrigin: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('PrivacyService.createRevocation', () => {
  it('requires either a subject session or a subject user', async () => {
    const service = new PrivacyService(makePrisma());

    await expect(service.createRevocation({ scope: 'full' } as any, 'actor-1')).rejects.toThrow(BadRequestException);
  });

  it('creates the revocation and logs the request', async () => {
    const prisma = makePrisma();
    const service = new PrivacyService(prisma);

    const result = await service.createRevocation({ subjectSessionId: 's1', scope: 'text' } as any, 'actor-1');

    expect(result).toEqual({ id: 'rev-1', status: 'pending' });
    expect(prisma.consentRevocation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subjectSessionId: 's1', scope: 'text' }) }),
    );
    expect(mockedCore.writeAuditLog).toHaveBeenCalled();
  });
});

describe('PrivacyService.preview', () => {
  it('requires either a session or a user', () => {
    const service = new PrivacyService(makePrisma());

    expect(() => service.preview()).toThrow(BadRequestException);
  });

  it('previews the scrub for a given session', async () => {
    mockedCore.previewRevocationScrub.mockResolvedValue({ willScrub: 3 } as any);
    const prisma = makePrisma();
    const service = new PrivacyService(prisma);

    const result = await service.preview('s1', undefined);

    expect(result).toEqual({ willScrub: 3 });
    expect(mockedCore.previewRevocationScrub).toHaveBeenCalledWith(prisma, { subjectSessionId: 's1', subjectUserId: null, scope: 'full' });
  });
});

describe('PrivacyService.subjectAccessRequest', () => {
  it('requires either a session or a user', async () => {
    const service = new PrivacyService(makePrisma());

    await expect(service.subjectAccessRequest()).rejects.toThrow(BadRequestException);
  });

  it('only queries session-scoped tables when given a session id, not a user id', async () => {
    const prisma = makePrisma();
    const service = new PrivacyService(prisma);

    await service.subjectAccessRequest('s1', undefined);

    expect(prisma.submissionMeta.findMany).toHaveBeenCalledWith({ where: { sessionId: 's1' } });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('only queries the user table when given a user id, not a session id', async () => {
    const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }) } });
    const service = new PrivacyService(prisma);

    const result = await service.subjectAccessRequest(undefined, 'u1');

    expect(prisma.submissionMeta.findMany).not.toHaveBeenCalled();
    expect(result).toEqual({ submissions: [], contributorStats: null, user: { id: 'u1' }, origins: [] });
  });
});
