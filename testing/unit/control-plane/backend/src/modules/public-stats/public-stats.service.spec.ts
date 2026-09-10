import * as core from '@open-derja/core';
import { PublicStatsService } from '../../../../../../../control-plane/backend/src/modules/public-stats/public-stats.service';

jest.mock(
  '@open-derja/core',
  () => ({
    getLeaderboard: jest.fn().mockResolvedValue([]),
    getCoverage: jest.fn().mockResolvedValue({ regions: [], levelDistribution: [], translator: null }),
    getGaps: jest.fn().mockResolvedValue({ translatorMisses: [], weakRegions: [] }),
  }),
  { virtual: true },
);
const mockedCore = core as jest.Mocked<typeof core>;

beforeEach(() => jest.clearAllMocks());

describe('PublicStatsService', () => {
  it('forwards region and limit to getLeaderboard', async () => {
    const service = new PublicStatsService({} as any);

    await service.leaderboard({ region: 'north', limit: 10 } as any);

    expect(mockedCore.getLeaderboard).toHaveBeenCalledWith({}, 'north', 10);
  });

  it('delegates coverage to getCoverage', async () => {
    const service = new PublicStatsService({} as any);

    await service.coverage();

    expect(mockedCore.getCoverage).toHaveBeenCalledWith({});
  });

  it('delegates gaps to getGaps', async () => {
    const service = new PublicStatsService({} as any);

    await service.gaps();

    expect(mockedCore.getGaps).toHaveBeenCalledWith({});
  });
});
