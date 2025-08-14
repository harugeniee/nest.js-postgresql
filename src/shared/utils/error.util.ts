import { HttpException, HttpStatus } from '@nestjs/common';

type I18nLike =
  | { t: (key: string, args?: Record<string, any>) => string }
  | { translate: (key: string, args?: Record<string, any>) => string }
  | undefined;

export function translate(
  i18n: I18nLike,
  key: string,
  args?: Record<string, any>,
  fallback?: string,
): string {
  try {
    if (!i18n) return fallback ?? key;
    const anyI18n: any = i18n as any;
    if (typeof anyI18n.t === 'function') {
      return anyI18n.t(key, { args }) as string;
    }
    if (typeof anyI18n.translate === 'function') {
      return anyI18n.translate(key, args) as string;
    }
    return fallback ?? key;
  } catch {
    return fallback ?? key;
  }
}

export function throwI18n(
  status: HttpStatus,
  key: string,
  i18n: I18nLike,
  args?: Record<string, any>,
  extra?: Record<string, any>,
): never {
  const message = translate(i18n as any, key, args, extra?.fallback);
  throw new HttpException(
    { message, messageKey: key, ...(extra || {}) },
    status,
  );
}

export function notFound(entity: string, id: string, i18n: I18nLike): never {
  return throwI18n(HttpStatus.NOT_FOUND, 'common.NOT_FOUND', i18n, {
    entity,
    id,
  });
}

export function mapTypeOrmError(
  e: any,
  i18n: I18nLike,
  ctx?: Record<string, any>,
): never {
  const code = e?.code || e?.driverError?.code;
  if (code === '23505') {
    return throwI18n(HttpStatus.CONFLICT, 'common.DUPLICATE', i18n, ctx);
  }
  if (code === '23503') {
    return throwI18n(HttpStatus.BAD_REQUEST, 'common.FK_CONSTRAINT', i18n, ctx);
  }
  return throwI18n(
    HttpStatus.INTERNAL_SERVER_ERROR,
    'common.INTERNAL_SERVER_ERROR',
    i18n,
    { ...ctx, detail: e?.detail },
  );
}
