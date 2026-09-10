Object.defineProperty(BigInt.prototype, 'toJSON', {
  value: function toJSON(this: bigint): string {
    return this.toString();
  },
  writable: true,
  configurable: true,
});
