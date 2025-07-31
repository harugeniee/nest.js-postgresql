import { I18nService } from 'nestjs-i18n';

interface ResponseData {
  messageKey?: string;
  messageArgs?: Record<string, unknown>;
  data?: unknown;
}

export function formatI18nResponse(
  i18n: I18nService,
  lang: string,
  responseData: ResponseData,
): {
  message: string;
  messageKey: string;
  messageArgs: Record<string, unknown>;
} {
  const messageKey = responseData?.messageKey ?? 'common.default.success';
  const messageArgs = responseData?.messageArgs ?? {};

  const translatedMessage = i18n.t(`${messageKey}`, {
    lang,
    args: messageArgs,
  });

  return {
    message: translatedMessage as string,
    messageKey,
    messageArgs,
  };
}
