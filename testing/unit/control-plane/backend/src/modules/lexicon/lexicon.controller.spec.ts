import * as core from '@open-derja/core';
import { LexiconController } from '../../../../../../../control-plane/backend/src/modules/lexicon/lexicon.controller';

jest.mock(
  '@open-derja/core',
  () => ({
    addLexiconOrigin: jest.fn(),
    attestLexiconVariantRegion: jest.fn(),
    createLexiconEntry: jest.fn(),
    createLexiconForm: jest.fn(),
    createLexiconVariant: jest.fn(),
    findLexiconEntry: jest.fn(),
    searchLexiconEntries: jest.fn(),
  }),
  { virtual: true },
);

const mockedCore = core as jest.Mocked<typeof core>;

function makePrisma() {
  return {} as any;
}

function makeReqRes(cookies: Record<string, string> = {}) {
  const req: any = { cookies, ip: '1.2.3.4', socket: { remoteAddress: '1.2.3.4' } };
  const res: any = { cookie: jest.fn() };
  return { req, res };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LexiconController.addOrigin', () => {
  it('attributes the origin to the authenticated user and never touches session cookies', async () => {
    const prisma = makePrisma();
    mockedCore.addLexiconOrigin.mockResolvedValue({ id: 'origin-1' } as any);
    const controller = new LexiconController(prisma);
    const { req, res } = makeReqRes();

    const user = { id: 'user-1', role: 'contributor', trustLevel: 0, emailConfirmed: true };
    await controller.addOrigin('entry-1', { origin: 'berber' } as any, req, res, user as any);

    expect(mockedCore.addLexiconOrigin).toHaveBeenCalledWith(
      prisma,
      'entry-1',
      expect.objectContaining({ origin: 'berber', proposedBy: 'user-1' }),
    );
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('reuses an existing session cookie for an anonymous submission instead of minting a new one', async () => {
    const prisma = makePrisma();
    mockedCore.addLexiconOrigin.mockResolvedValue({ id: 'origin-1' } as any);
    const controller = new LexiconController(prisma);
    const { req, res } = makeReqRes({ session_id: 'existing-session' });

    await controller.addOrigin('entry-1', { origin: 'berber' } as any, req, res, undefined);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(mockedCore.addLexiconOrigin).toHaveBeenCalledWith(
      prisma,
      'entry-1',
      expect.objectContaining({ sessionId: 'existing-session' }),
    );
  });

  it('mints and sets a new session cookie for a first-time anonymous submission', async () => {
    const prisma = makePrisma();
    mockedCore.addLexiconOrigin.mockResolvedValue({ id: 'origin-1' } as any);
    const controller = new LexiconController(prisma);
    const { req, res } = makeReqRes();

    await controller.addOrigin('entry-1', { origin: 'berber' } as any, req, res, undefined);

    expect(res.cookie).toHaveBeenCalledWith('session_id', expect.any(String), expect.objectContaining({ httpOnly: true }));
    const [, sessionId] = res.cookie.mock.calls[0];
    expect(mockedCore.addLexiconOrigin).toHaveBeenCalledWith(prisma, 'entry-1', expect.objectContaining({ sessionId }));
  });
});
