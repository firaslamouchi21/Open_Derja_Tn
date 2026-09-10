import { OverviewService } from '../../../../../../../../control-plane/backend/src/modules/admin/overview/overview.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  const prisma: any = {
    corpusItem: { count: jest.fn().mockResolvedValue(0) },
    task: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    regionStats: { findMany: jest.fn().mockResolvedValue([]) },
    tagConsensus: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { agreement: null } }),
      count: jest.fn().mockResolvedValue(0),
    },
    translatorRegionMiss: { findMany: jest.fn().mockResolvedValue([]) },
    translatorStats: { findUnique: jest.fn().mockResolvedValue(null) },
    contributorStats: { count: jest.fn().mockResolvedValue(0) },
    source: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    outboxEvent: { count: jest.fn().mockResolvedValue(0) },
    databaseBackup: { findFirst: jest.fn().mockResolvedValue(null) },
    ...overrides,
  };
  return prisma;
}

describe('OverviewService.overview — scraperStatus widget', () => {
  it('reports no alert when no source has ever been auto-disabled for repeated failure', async () => {
    const prisma = makePrisma({
      source: {
        findMany: jest.fn().mockResolvedValue([{ name: 'brand-new-source', active: true, lastRunAt: null }]),
      },
    });

    const service = new OverviewService(prisma);
    const result = await service.overview();

    expect(result.scraperStatus.alert).toBe(false);
  });

  it('alerts when a source has been auto-disabled after repeated scrape failures', async () => {
    const prisma = makePrisma({
      source: {
        findMany: jest.fn().mockResolvedValue([{ name: 'flaky-source', active: false, lastRunAt: new Date() }]),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([{ entityId: 'source-1' }]),
      },
    });

    const service = new OverviewService(prisma);
    const result = await service.overview();

    expect(result.scraperStatus.alert).toBe(true);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { entityType: 'source', action: 'scrape_source_disabled' } }),
    );
  });

  it('counts each disabled source once even with multiple disable events', async () => {
    const prisma = makePrisma({
      auditLog: {
        findMany: jest.fn().mockResolvedValue([{ entityId: 'source-1' }, { entityId: 'source-2' }]),
      },
    });

    const service = new OverviewService(prisma);
    const result = await service.overview();

    expect(result.scraperStatus.alert).toBe(true);
  });
});
