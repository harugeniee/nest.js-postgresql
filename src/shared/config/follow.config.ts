import { registerAs } from '@nestjs/config';

export interface FollowConfig {
  redisUrl: string;
  backend: 'roaring-wasm' | 'roaring-bitmap';
  persistIntervalSec: number;
  storageMode: 'bitset' | 'edges';
  maxFollowsPerSecond: number;
  cacheTtl: number;
  rebuildIntervalSec: number;
}

export const followConfig = registerAs(
  'follow',
  (): FollowConfig => ({
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    backend:
      (process.env.FOLLOW_BITSET_BACKEND as
        | 'roaring-wasm'
        | 'roaring-bitmap') || 'roaring-bitmap',
    persistIntervalSec: parseInt(
      process.env.FOLLOW_BITSET_PERSIST_INTERVAL_SEC || '300',
      10,
    ),
    storageMode:
      (process.env.FOLLOW_STORAGE_MODE as 'bitset' | 'edges') || 'bitset',
    maxFollowsPerSecond: parseInt(
      process.env.FOLLOW_MAX_PER_SECOND || '10',
      10,
    ),
    cacheTtl: parseInt(process.env.FOLLOW_CACHE_TTL || '3600', 10),
    rebuildIntervalSec: parseInt(
      process.env.FOLLOW_REBUILD_INTERVAL_SEC || '600',
      10,
    ),
  }),
);
