import { CorpusItemsController } from '../../../../../../../control-plane/backend/src/modules/corpus-items/corpus-items.controller';

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    explore: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
    contribute: jest.fn().mockResolvedValue({ id: 'item-1' }),
    findOne: jest.fn().mockResolvedValue({ id: 'item-1' }),
    ...overrides,
  } as any;
}

function makeReqRes(cookies: Record<string, string> = {}) {
  const req: any = { cookies, ip: '1.2.3.4', socket: { remoteAddress: '1.2.3.4' } };
  const res: any = { cookie: jest.fn() };
  return { req, res };
}

describe('CorpusItemsController.search', () => {
  it('forwards the query straight to the service', async () => {
    const service = makeService();
    const controller = new CorpusItemsController(service);

    await controller.search({ q: 'kifech' } as any);

    expect(service.explore).toHaveBeenCalledWith({ q: 'kifech' });
  });
});

describe('CorpusItemsController.findOne', () => {
  it('forwards the id straight to the service', async () => {
    const service = makeService();
    const controller = new CorpusItemsController(service);

    await controller.findOne('item-1');

    expect(service.findOne).toHaveBeenCalledWith('item-1');
  });
});

describe('CorpusItemsController.contribute', () => {
  it('reuses an existing session cookie instead of minting a new one', async () => {
    const service = makeService();
    const controller = new CorpusItemsController(service);
    const { req, res } = makeReqRes({ session_id: 'existing-session' });

    await controller.contribute({ text: 'aslema' } as any, req, res);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(service.contribute).toHaveBeenCalledWith(
      { text: 'aslema' },
      expect.objectContaining({ sessionId: 'existing-session' }),
    );
  });

  it('mints and sets a new session cookie for a first-time contributor', async () => {
    const service = makeService();
    const controller = new CorpusItemsController(service);
    const { req, res } = makeReqRes();

    await controller.contribute({ text: 'aslema' } as any, req, res);

    expect(res.cookie).toHaveBeenCalledWith('session_id', expect.any(String), expect.objectContaining({ httpOnly: true }));
    const [, sessionId] = res.cookie.mock.calls[0];
    expect(service.contribute).toHaveBeenCalledWith({ text: 'aslema' }, expect.objectContaining({ sessionId }));
  });

  it('hashes the caller IP rather than passing it through raw', async () => {
    const service = makeService();
    const controller = new CorpusItemsController(service);
    const { req, res } = makeReqRes({ session_id: 'existing-session' });

    await controller.contribute({ text: 'aslema' } as any, req, res);

    const [, ctx] = service.contribute.mock.calls[0];
    expect(ctx.ipHash).toBeDefined();
    expect(ctx.ipHash).not.toBe('1.2.3.4');
  });
});
