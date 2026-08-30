import * as core from '@open-derja/core';
import { TranslateController } from '../../../../../../../control-plane/backend/src/modules/translate/translate.controller';

jest.mock(
  '@open-derja/core',
  () => ({
    getTranslatorCoverage: jest.fn(),
    lookupTranslation: jest.fn(),
    logTranslatorLookup: jest.fn().mockResolvedValue(undefined),
    isLookupHit: jest.fn().mockReturnValue(false),
  }),
  { virtual: true },
);

const mockedCore = core as jest.Mocked<typeof core>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TranslateController.lookup', () => {
  it('passes the query params straight through to lookupTranslation', async () => {
    const prisma = {} as any;
    mockedCore.lookupTranslation.mockResolvedValue({ query: 'chnowa', matchKey: 'chnwa' } as any);
    const controller = new TranslateController(prisma);

    const result = await controller.lookup({ text: 'chnowa', region: 'sahel', includeVulgar: true } as any);

    expect(mockedCore.lookupTranslation).toHaveBeenCalledWith(prisma, 'chnowa', 'sahel', true);
    expect(result).toEqual({ query: 'chnowa', matchKey: 'chnwa' });
  });

  it('records every lookup as a demand signal but never lets a log failure break the response', async () => {
    const prisma = {} as any;
    mockedCore.lookupTranslation.mockResolvedValue({ query: 'x', matchKey: 'x', exact: [], fuzzy: [] } as any);
    (mockedCore.logTranslatorLookup as jest.Mock).mockRejectedValueOnce(new Error('db down'));
    const controller = new TranslateController(prisma);

    await expect(controller.lookup({ text: 'x' } as any)).resolves.toEqual(
      expect.objectContaining({ query: 'x' }),
    );
    expect(mockedCore.logTranslatorLookup).toHaveBeenCalled();
  });
});

describe('TranslateController.coverage', () => {
  it('delegates straight to getTranslatorCoverage', async () => {
    const prisma = {} as any;
    mockedCore.getTranslatorCoverage.mockResolvedValue({ wordCount: 1, sentenceCount: 2 } as any);
    const controller = new TranslateController(prisma);

    const result = await controller.coverage();

    expect(mockedCore.getTranslatorCoverage).toHaveBeenCalledWith(prisma);
    expect(result).toEqual({ wordCount: 1, sentenceCount: 2 });
  });
});
