export interface BuildResponseOptions {
  data?: any;
  messageKey?: string;
  messageArgs?: Record<string, any>;
}

export function buildResponse<T>({
  data = {},
  messageKey,
  messageArgs,
}: BuildResponseOptions) {
  return {
    data: data as T,
    messageKey,
    messageArgs,
  };
}
