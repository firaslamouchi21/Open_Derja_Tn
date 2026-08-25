import { LocalStorageProvider, verifyLocalStorageToken } from '../../../../../../control-plane/backend/core/src/storage/local.provider';

function parseSignedUrl(url: string) {
  const parsed = new URL(url);
  const key = decodeURIComponent(parsed.pathname.split('/').pop() as string);
  const exp = Number(parsed.searchParams.get('exp'));
  const sig = parsed.searchParams.get('sig') as string;
  return { key, exp, sig };
}

describe('LocalStorageProvider', () => {
  const config = {
    baseDir: '/tmp/opendarja-storage-test',
    baseUrl: 'http://localhost:3000',
    secret: 'test-secret',
  };

  it('issues an upload URL whose signature verifies', async () => {
    const provider = new LocalStorageProvider(config);
    const url = await provider.getUploadUrl('snapshots/foo.json');
    const { key, exp, sig } = parseSignedUrl(url);

    expect(key).toBe('snapshots/foo.json');
    expect(verifyLocalStorageToken(key, exp, sig, config.secret)).toBe(true);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const provider = new LocalStorageProvider(config);
    const url = await provider.getUploadUrl('snapshots/foo.json');
    const { key, exp, sig } = parseSignedUrl(url);

    expect(verifyLocalStorageToken(key, exp, sig, 'wrong-secret')).toBe(false);
  });

  it('rejects an expired token even with a correct signature', async () => {
    const provider = new LocalStorageProvider(config);
    const url = await provider.getUploadUrl('snapshots/foo.json', { expiresInSeconds: -1 });
    const { key, exp, sig } = parseSignedUrl(url);

    expect(verifyLocalStorageToken(key, exp, sig, config.secret)).toBe(false);
  });

  it('rejects a token whose key was tampered with', async () => {
    const provider = new LocalStorageProvider(config);
    const url = await provider.getUploadUrl('snapshots/foo.json');
    const { exp, sig } = parseSignedUrl(url);

    expect(verifyLocalStorageToken('snapshots/bar.json', exp, sig, config.secret)).toBe(false);
  });
});
