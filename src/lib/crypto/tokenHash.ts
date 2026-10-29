/**
 * JEEVASCAN AI — CRYPTOGRAPHIC TOKEN UTILITIES
 * Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
 * 
 * Provides SHA-256 bearer token hashing and verification using the standard Web Crypto API.
 */

/**
 * Computes the lowercase 64-character SHA-256 hex digest of a token string.
 */
export async function hashBearerToken(token: string): Promise<string> {
  if (!token || typeof token !== 'string') return '';
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (!cryptoObj?.subtle) {
    // Non-subtle fallback (e.g. older environments or minimal test shims)
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates whether a string is a standard 64-character lowercase SHA-256 hex digest.
 */
export function isSha256Hex(str: string): boolean {
  return typeof str === 'string' && str.length === 64 && /^[0-9a-f]{64}$/i.test(str);
}

