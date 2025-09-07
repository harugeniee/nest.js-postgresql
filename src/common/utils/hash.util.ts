import { createHash } from 'crypto';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function stableStringify(value: unknown): string {
  const seen = new WeakSet();
  const stringify = (val: unknown): unknown => {
    if (val && typeof val === 'object') {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
      if (Array.isArray(val)) return val.map(stringify);
      return Object.keys(val)
        .sort((a, b) => a.localeCompare(b))
        .reduce((acc: Record<string, unknown>, key) => {
          acc[key] = stringify(val[key]);
          return acc;
        }, {});
    }
    return val;
  };
  const ordered = stringify(value);
  if (ordered && typeof ordered === 'object' && !Array.isArray(ordered)) {
    const keys = Object.keys(ordered).sort((a, b) => a.localeCompare(b));
    const obj: Record<string, unknown> = {};
    for (const k of keys) obj[k] = ordered[k];
    return JSON.stringify(obj);
  }
  return JSON.stringify(ordered);
}
