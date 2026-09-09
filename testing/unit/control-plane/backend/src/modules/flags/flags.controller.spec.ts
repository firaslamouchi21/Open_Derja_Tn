import { FlagsController } from '../../../../../../../control-plane/backend/src/modules/flags/flags.controller';

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    create: jest.fn().mockResolvedValue({ id: 'flag-1' }),
    findAll: jest.fn().mockResolvedValue([]),
    resolve: jest.fn().mockResolvedValue({ id: 'flag-1', status: 'resolved' }),
    dismiss: jest.fn().mockResolvedValue({ id: 'flag-1', status: 'dismissed' }),
    ...overrides,
  } as any;
}

function makeReqRes(cookies: Record<string, string> = {}) {
  const req: any = { cookies, ip: '9.9.9.9', socket: { remoteAddress: '9.9.9.9' } };
  const res: any = { cookie: jest.fn() };
  return { req, res };
}

describe('FlagsController.create', () => {
  it('reuses an existing session cookie instead of minting a new one', async () => {
    const service = makeService();
    const controller = new FlagsController(service);
    const { req, res } = makeReqRes({ session_id: 'existing-session' });

    await controller.create({ targetType: 'corpus_item', targetId: 'item-1', reason: 'wrong' } as any, req, res);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(service.create).toHaveBeenCalledWith(
      { targetType: 'corpus_item', targetId: 'item-1', reason: 'wrong' },
      expect.objectContaining({ sessionId: 'existing-session' }),
    );
  });

  it('mints and sets a new session cookie for a first-time reporter', async () => {
    const service = makeService();
    const controller = new FlagsController(service);
    const { req, res } = makeReqRes();

    await controller.create({ targetType: 'corpus_item', targetId: 'item-1', reason: 'wrong' } as any, req, res);

    expect(res.cookie).toHaveBeenCalledWith('session_id', expect.any(String), expect.objectContaining({ httpOnly: true }));
  });

  it('hashes the caller IP rather than passing it through raw', async () => {
    const service = makeService();
    const controller = new FlagsController(service);
    const { req, res } = makeReqRes({ session_id: 'existing-session' });

    await controller.create({ targetType: 'corpus_item', targetId: 'item-1', reason: 'wrong' } as any, req, res);

    const [, ctx] = service.create.mock.calls[0];
    expect(ctx.ipHash).toBeDefined();
    expect(ctx.ipHash).not.toBe('9.9.9.9');
  });
});

describe('FlagsController — reviewer routes', () => {
  it('findAll forwards the status filter to the service', async () => {
    const service = makeService();
    const controller = new FlagsController(service);

    await controller.findAll('open' as any);

    expect(service.findAll).toHaveBeenCalledWith('open');
  });

  it('resolve delegates with the id and the acting user', async () => {
    const service = makeService();
    const controller = new FlagsController(service);

    await controller.resolve({ id: 'reviewer-1' } as any, 'flag-1');

    expect(service.resolve).toHaveBeenCalledWith('flag-1', 'reviewer-1');
  });

  it('dismiss delegates with the id and the acting user', async () => {
    const service = makeService();
    const controller = new FlagsController(service);

    await controller.dismiss({ id: 'reviewer-1' } as any, 'flag-1');

    expect(service.dismiss).toHaveBeenCalledWith('flag-1', 'reviewer-1');
  });
});
