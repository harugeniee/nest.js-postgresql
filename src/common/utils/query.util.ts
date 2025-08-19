export function normalizeSearchInput(
  value?: string | null,
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.normalize('NFC');
}

export function applyWhitelist<T extends object>(
  input: string[] | undefined,
  whitelist: string[] | undefined,
): string[] | undefined {
  if (!input || input.length === 0) return undefined;
  if (!whitelist || whitelist.length === 0) return input;
  return input.filter((r) => whitelist.includes(r));
}
