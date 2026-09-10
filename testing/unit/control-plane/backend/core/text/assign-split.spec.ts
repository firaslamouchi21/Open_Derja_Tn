import { assignDatasetSplit } from '../../../../../../control-plane/backend/core/src/text/assign-split';

describe('assignDatasetSplit', () => {
  it('assigns train for the low end of the roll', () => {
    expect(assignDatasetSplit(() => 0)).toBe('train');
    expect(assignDatasetSplit(() => 0.79)).toBe('train');
  });

  it('assigns dev for the middle band of the roll', () => {
    expect(assignDatasetSplit(() => 0.8)).toBe('dev');
    expect(assignDatasetSplit(() => 0.89)).toBe('dev');
  });

  it('assigns test for the high band of the roll', () => {
    expect(assignDatasetSplit(() => 0.9)).toBe('test');
    expect(assignDatasetSplit(() => 0.99)).toBe('test');
  });

  it('never changes the split once assigned for a fixed random source', () => {
    const fixedRandom = () => 0.5;
    expect(assignDatasetSplit(fixedRandom)).toBe(assignDatasetSplit(fixedRandom));
  });
});
