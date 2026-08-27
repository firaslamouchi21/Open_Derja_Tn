import * as core from '@open-derja/core';
import { TranslateController } from '../../../../../../../control-plane/backend/src/modules/translate/translate.controller';

jest.mock(
  '@open-derja/core',
  () => ({
    getTranslatorCoverage: jest.fn(),
    lookupTranslation: jest.fn(),
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
    mockedCore.lookupTranslation.mockResolvedValue({ query: 'chnowa' } as any);
    const controller = new TranslateController(prisma);

    const result = await controller.lookup({ text: 'chnowa', region: 'sahel', includeVulgar: true } as any);

    expect(mockedCore.lookupTranslation).toHaveBeenCalledWith(prisma, 'chnowa', 'sahel', true);
    expect(result).toEqual({ query: 'chnowa' });
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
