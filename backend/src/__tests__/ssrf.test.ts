import { describe, it, expect } from 'vitest';
import { assertSafeOutboundUrl, UnsafeOutboundUrlError } from '../utils/ssrf';

// These tests use IP literals to keep DNS out of the loop — DNS lookups
// would otherwise depend on the test machine's network state and add
// flakiness. The DNS-resolution path is exercised in production where
// the guard runs against admin-supplied hostnames.

async function expectUnsafe(url: string, hint: string) {
  await expect(assertSafeOutboundUrl(url)).rejects.toThrow(UnsafeOutboundUrlError);
  // The error message should mention the reason so audit logs are useful.
  try {
    await assertSafeOutboundUrl(url);
  } catch (e: any) {
    expect(typeof e.message).toBe('string');
    expect(e.message.length).toBeGreaterThan(0);
    if (hint) expect(e.message.toLowerCase()).toContain(hint.toLowerCase());
  }
}

describe('assertSafeOutboundUrl', () => {
  describe('scheme guard', () => {
    it('blocks non-http schemes', async () => {
      await expectUnsafe('file:///etc/passwd', 'scheme');
      await expectUnsafe('gopher://1.1.1.1:70/', 'scheme');
      await expectUnsafe('ftp://1.1.1.1/', 'scheme');
    });

    it('accepts http and https', async () => {
      // 1.1.1.1 is Cloudflare — public, safe in this test only to prove
      // the scheme check passes. The DNS lookup is skipped because the
      // host is already a literal IP.
      const okHttp = await assertSafeOutboundUrl('http://1.1.1.1/');
      const okHttps = await assertSafeOutboundUrl('https://1.1.1.1/');
      expect(okHttp.protocol).toBe('http:');
      expect(okHttps.protocol).toBe('https:');
    });
  });

  describe('private IP literals', () => {
    it('blocks loopback', async () => {
      await expectUnsafe('http://127.0.0.1/', 'private');
      await expectUnsafe('http://127.255.255.1:6379/', 'private');
      await expectUnsafe('http://[::1]/', 'private');
    });

    it('blocks RFC1918', async () => {
      await expectUnsafe('http://10.0.0.5/', 'private');
      await expectUnsafe('http://192.168.1.1/', 'private');
      await expectUnsafe('http://172.16.0.5/', 'private');
      await expectUnsafe('http://172.31.255.255/', 'private');
    });

    it('blocks link-local (cloud metadata)', async () => {
      // 169.254.169.254 is AWS/Azure/GCP instance metadata — the classic
      // SSRF target.
      await expectUnsafe('http://169.254.169.254/latest/meta-data/', 'private');
      await expectUnsafe('http://[fe80::1]/', 'private');
    });

    it('blocks IPv4-mapped IPv6 forms of private ranges', async () => {
      await expectUnsafe('http://[::ffff:127.0.0.1]/', 'private');
      await expectUnsafe('http://[::ffff:10.0.0.1]/', 'private');
    });

    it('blocks CGNAT 100.64/10', async () => {
      await expectUnsafe('http://100.64.1.1/', 'private');
    });

    it('blocks IPv6 unique-local fc00::/7', async () => {
      await expectUnsafe('http://[fc00::1]/', 'private');
      await expectUnsafe('http://[fd12:3456:789a::1]/', 'private');
    });
  });

  describe('URL hygiene', () => {
    it('rejects userinfo in URL', async () => {
      await expectUnsafe('http://admin:pw@1.1.1.1/', 'userinfo');
    });

    it('rejects unparseable URLs', async () => {
      await expectUnsafe('not a url', 'parse');
    });
  });
});
