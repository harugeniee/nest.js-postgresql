import { HttpStatus } from '@nestjs/common';
import { throwI18n } from './error.util';

export function encodeCursor(
  sortBy: string,
  order: 'ASC' | 'DESC',
  value: any,
): string {
  const payload = { k: sortBy, o: order, v: value };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decodeCursor(
  cursor?: string,
  i18n?: any,
): { k?: string; o?: 'ASC' | 'DESC'; v?: any } {
  if (!cursor) return {};
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return parsed;
  } catch {
    return throwI18n(HttpStatus.BAD_REQUEST, 'common.VALIDATION_ERROR', i18n, {
      field: 'cursor',
      reason: 'invalid',
    });
  }
}
