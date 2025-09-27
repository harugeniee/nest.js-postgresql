import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FollowConfig } from '../../shared/config/follow.config';

/**
 * RoaringSet interface for bitmap operations
 */
export interface RoaringSet {
  has(id: number): boolean;
  add(id: number): void;
  remove(id: number): void;
  or(other: RoaringSet): RoaringSet;
  and(other: RoaringSet): RoaringSet;
  andNot(other: RoaringSet): RoaringSet;
  toBuffer(): Buffer;
  size(): number;
  toArray(limit?: number): number[];
  clear(): void;
  isEmpty(): boolean;
}

/**
 * RoaringAdapter interface for different roaring implementations
 */
export interface RoaringAdapter {
  init(): Promise<void>;
  newSet(): RoaringSet;
  fromSerialized(buf: Buffer | Uint8Array): RoaringSet;
  isReady(): boolean;
}

/**
 * RoaringWasmAdapter - DISABLED - Uses roaring-wasm for high performance
 * This adapter is disabled to avoid dependency issues
 */
@Injectable()
export class RoaringWasmAdapter implements RoaringAdapter {
  private readonly logger = new Logger(RoaringWasmAdapter.name);
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async init(): Promise<void> {
    this.logger.warn(
      '❌ RoaringWasmAdapter is disabled - using fallback instead',
    );
    throw new Error(
      'RoaringWasmAdapter is disabled to avoid dependency issues',
    );
  }

  isReady(): boolean {
    return false;
  }

  newSet(): RoaringSet {
    throw new Error('RoaringWasmAdapter is disabled');
  }

  fromSerialized(buf: Buffer | Uint8Array): RoaringSet {
    throw new Error('RoaringWasmAdapter is disabled');
  }
}

/**
 * RoaringBitmapAdapter - DISABLED - Using roaring package
 * This adapter is disabled to avoid dependency issues
 */
@Injectable()
export class RoaringBitmapAdapter implements RoaringAdapter {
  private readonly logger = new Logger(RoaringBitmapAdapter.name);
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async init(): Promise<void> {
    this.logger.warn(
      '❌ RoaringBitmapAdapter is disabled - using fallback instead',
    );
    throw new Error(
      'RoaringBitmapAdapter is disabled to avoid dependency issues',
    );
  }

  isReady(): boolean {
    return false;
  }

  newSet(): RoaringSet {
    throw new Error('RoaringBitmapAdapter is disabled');
  }

  fromSerialized(buf: Buffer | Uint8Array): RoaringSet {
    throw new Error('RoaringBitmapAdapter is disabled');
  }
}

/**
 * RoaringWasmSet - Implementation using roaring-wasm
 */
class RoaringWasmSet implements RoaringSet {
  private readonly set: any;

  constructor(roaring: any, data?: Buffer | Uint8Array) {
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      this.set = new roaring.RoaringBitmap32(data);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      this.set = new roaring.RoaringBitmap32();
    }
  }

  has(id: number): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.set.has(id);
  }

  add(id: number): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.set.add(id);
  }

  remove(id: number): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.set.remove(id);
  }

  or(other: RoaringSet): RoaringSet {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const result = new RoaringWasmSet(this.set.constructor);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    (result as any).set = this.set.or((other as RoaringWasmSet).set);
    return result;
  }

  and(other: RoaringSet): RoaringSet {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const result = new RoaringWasmSet(this.set.constructor);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    (result as any).set = this.set.and((other as RoaringWasmSet).set);
    return result;
  }

  andNot(other: RoaringSet): RoaringSet {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const result = new RoaringWasmSet(this.set.constructor);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    (result as any).set = this.set.andNot((other as RoaringWasmSet).set);
    return result;
  }

  toBuffer(): Buffer {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return Buffer.from(this.set.serialize());
  }

  size(): number {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return this.set.size;
  }

  toArray(limit?: number): number[] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const array = this.set.toArray();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return limit ? array.slice(0, limit) : array;
  }

  clear(): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.set.clear();
  }

  isEmpty(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.set.isEmpty();
  }
}

/**
 * RoaringBitmapSet - Implementation using roaring package
 */
class RoaringBitmapSet implements RoaringSet {
  private readonly set: any;

  constructor(roaring: any, data?: Buffer | Uint8Array) {
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.set = roaring.RoaringBitmap32.deserialize(data);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      this.set = new roaring.RoaringBitmap32();
    }
  }

  has(id: number): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.set.has(id);
  }

  add(id: number): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.set.add(id);
  }

  remove(id: number): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.set.remove(id);
  }

  or(other: RoaringSet): RoaringSet {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const result = new RoaringBitmapSet(this.set.constructor);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    (result as any).set = this.set.or((other as RoaringBitmapSet).set);
    return result;
  }

  and(other: RoaringSet): RoaringSet {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const result = new RoaringBitmapSet(this.set.constructor);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    (result as any).set = this.set.and((other as RoaringBitmapSet).set);
    return result;
  }

  andNot(other: RoaringSet): RoaringSet {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const result = new RoaringBitmapSet(this.set.constructor);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    (result as any).set = this.set.andNot((other as RoaringBitmapSet).set);
    return result;
  }

  toBuffer(): Buffer {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return Buffer.from(this.set.serialize());
  }

  size(): number {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return this.set.size;
  }

  toArray(limit?: number): number[] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const array = this.set.toArray();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return limit ? array.slice(0, limit) : array;
  }

  clear(): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.set.clear();
  }

  isEmpty(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.set.isEmpty();
  }
}

/**
 * RoaringFallbackSet - Fallback implementation using JavaScript Set
 */
class RoaringFallbackSet implements RoaringSet {
  private readonly set: Set<number>;

  constructor(data?: Buffer | Uint8Array) {
    this.set = new Set<number>();
    if (data) {
      // Simple deserialization from JSON
      try {
        const jsonStr = Buffer.from(data).toString('utf-8');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const array = JSON.parse(jsonStr);
        if (Array.isArray(array)) {
          array.forEach((id: number) => this.set.add(id));
        }
      } catch {
        // If deserialization fails, start with empty set
      }
    }
  }

  has(id: number): boolean {
    return this.set.has(id);
  }

  add(id: number): void {
    this.set.add(id);
  }

  remove(id: number): void {
    this.set.delete(id);
  }

  or(other: RoaringSet): RoaringSet {
    const result = new RoaringFallbackSet();
    this.set.forEach((id) => result.set.add(id));
    if (other instanceof RoaringFallbackSet) {
      other.set.forEach((id) => result.set.add(id));
    }
    return result;
  }

  and(other: RoaringSet): RoaringSet {
    const result = new RoaringFallbackSet();
    if (other instanceof RoaringFallbackSet) {
      this.set.forEach((id) => {
        if (other.set.has(id)) {
          result.set.add(id);
        }
      });
    }
    return result;
  }

  andNot(other: RoaringSet): RoaringSet {
    const result = new RoaringFallbackSet();
    if (other instanceof RoaringFallbackSet) {
      this.set.forEach((id) => {
        if (!other.set.has(id)) {
          result.set.add(id);
        }
      });
    }
    return result;
  }

  toBuffer(): Buffer {
    // Simple serialization to JSON
    const array = Array.from(this.set);
    const jsonStr = JSON.stringify(array);
    return Buffer.from(jsonStr, 'utf-8');
  }

  size(): number {
    return this.set.size;
  }

  toArray(limit?: number): number[] {
    const array = Array.from(this.set).sort((a, b) => a - b);
    return limit ? array.slice(0, limit) : array;
  }

  clear(): void {
    this.set.clear();
  }

  isEmpty(): boolean {
    return this.set.size === 0;
  }
}

/**
 * RoaringFallbackAdapter - Fallback using Set when roaring packages are not available
 */
@Injectable()
export class RoaringFallbackAdapter implements RoaringAdapter {
  private readonly logger = new Logger(RoaringFallbackAdapter.name);
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async init(): Promise<void> {
    try {
      this.isInitialized = true;
      this.logger.log('✅ RoaringFallbackAdapter initialized successfully');
      this.logger.warn(
        '⚠️ Using fallback Set implementation instead of roaring bitmap',
      );
    } catch (error) {
      this.logger.error(
        '❌ Failed to initialize RoaringFallbackAdapter:',
        error,
      );
      throw new Error('Failed to initialize fallback adapter');
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  newSet(): RoaringSet {
    if (!this.isReady()) {
      throw new Error('RoaringFallbackAdapter not initialized');
    }
    return new RoaringFallbackSet();
  }

  fromSerialized(buf: Buffer | Uint8Array): RoaringSet {
    if (!this.isReady()) {
      throw new Error('RoaringFallbackAdapter not initialized');
    }
    return new RoaringFallbackSet(buf);
  }
}

/**
 * RoaringAdapterFactory - Factory for creating roaring adapters
 * Now always uses fallback adapter to avoid dependency issues
 */
@Injectable()
export class RoaringAdapterFactory {
  private readonly logger = new Logger(RoaringAdapterFactory.name);

  constructor(private readonly configService: ConfigService) {}

  async createAdapter(): Promise<RoaringAdapter> {
    const config = this.configService.get<FollowConfig>('follow');
    const backend = config?.backend || 'fallback';

    this.logger.log(`Creating roaring adapter with backend: ${backend}`);

    // Always use fallback adapter to avoid dependency issues
    this.logger.warn(
      '⚠️ Using fallback Set implementation instead of roaring packages',
    );

    try {
      const fallbackAdapter = new RoaringFallbackAdapter(this.configService);
      await fallbackAdapter.init();
      return fallbackAdapter;
    } catch (error) {
      this.logger.error('Failed to create fallback adapter:', error);
      throw error;
    }
  }
}
