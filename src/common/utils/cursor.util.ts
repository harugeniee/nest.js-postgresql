export type CursorToken = {
  key: string;
  order: 'ASC' | 'DESC';
  value: Record<string, unknown>;
};

export function encodeCursor(token: CursorToken): string {
  const json = JSON.stringify(token);
  return Buffer.from(json, 'utf8').toString('base64');
}

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
    )
      return null;
    return token;
  } catch {
    return null;
  }
}
