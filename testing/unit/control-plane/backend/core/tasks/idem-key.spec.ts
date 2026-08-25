import { computeIdemKey, emptySlot, ordinalSlot, spanSlot } from '../../../../../../control-plane/backend/core/src/tasks/idem-key';

describe('computeIdemKey', () => {
  it('is deterministic for the same inputs', () => {
    const a = computeIdemKey('item-1', 'review' as any, 3, emptySlot);
    const b = computeIdemKey('item-1', 'review' as any, 3, emptySlot);
    expect(a).toBe(b);
  });

  it('changes when the slot changes, so parallel span/ordinal tasks never collide', () => {
    const first = computeIdemKey('item-1', 'confirm' as any, 1, ordinalSlot(1));
    const second = computeIdemKey('item-1', 'confirm' as any, 1, ordinalSlot(2));
    expect(first).not.toBe(second);
  });

  it('changes when segment_version changes, so a standardisation rewrite gets a fresh key', () => {
    const v1 = computeIdemKey('item-1', 'review' as any, 1, emptySlot);
    const v2 = computeIdemKey('item-1', 'review' as any, 2, emptySlot);
    expect(v1).not.toBe(v2);
  });

  it('produces a 64-character hex sha256 digest', () => {
    const key = computeIdemKey('item-1', 'review' as any, 1, emptySlot);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('spanSlot', () => {
  it('formats as start:end', () => {
    expect(spanSlot(4, 10)).toBe('4:10');
  });
});

describe('ordinalSlot', () => {
  it('formats as a plain string ordinal', () => {
    expect(ordinalSlot(1)).toBe('1');
    expect(ordinalSlot(2)).toBe('2');
  });
});
