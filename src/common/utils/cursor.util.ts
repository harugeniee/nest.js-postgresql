import { createHmac } from 'crypto';
import { appConfig } from 'src/shared/config/app.config';

/**
 * Represents a token used for pagination
 * @key - The key to sort by
 * @order - The order of the sort
 * @value - The value to sort by
 */

export type CursorToken = {
  key: string;
  order: 'ASC' | 'DESC';
  value: Record<string, unknown>;
};

/**
 * Encodes a cursor token into a base64 string
 * @param token - The cursor token to encode
 * @returns The base64 encoded string
 */
export function encodeCursor(token: CursorToken): string {
  const json = JSON.stringify(token);
  return Buffer.from(json, 'utf8').toString('base64');
}

/**
 * Decodes a base64 string into a cursor token
 * @param cursor - The base64 encoded string
 * @returns The cursor token
 */
export function decodeCursor(cursor?: string | null): CursorToken | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf8');
    const token = JSON.parse(json) as CursorToken;
    if (
      !token ||
      typeof token.key !== 'string' ||
      (token.order !== 'ASC' && token.order !== 'DESC') ||
      typeof token.value !== 'object'
    ) {
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Verifies a cursor token
 * @param b64 - The base64 encoded string
 * @returns The cursor token
 */
export function decodeSignedCursor(b64?: string | null): CursorToken | null {
  const CURSOR_HMAC_SECRET = appConfig().cursor.hmacSecret!;
  if (!b64) return null;
  const [data, sig] = b64.split('.');
  if (!data || !sig) return null;
  try {
    const expect = createHmac('sha256', CURSOR_HMAC_SECRET)
      .update(data)
      .digest('base64url');
    if (sig !== expect) return null;
  } catch {
    return null;
  }

  const json = Buffer.from(data, 'base64url').toString('utf8');
  const token = JSON.parse(json) as CursorToken;
  if (
    !token ||
    typeof token.key !== 'string' ||
    (token.order !== 'ASC' && token.order !== 'DESC') ||
    typeof token.value !== 'object'
  ) {
    return null;
  }
  return token;
}

/**
 * Signs a cursor token
 * @param payload - The cursor token to sign
 * @returns The signed cursor token
 */
export function encodeSignedCursor(payload: CursorToken): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const CURSOR_HMAC_SECRET = appConfig().cursor.hmacSecret!;
  const sig = createHmac('sha256', CURSOR_HMAC_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}
