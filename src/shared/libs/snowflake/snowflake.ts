export interface ParsedSnowflake {
  timestamp: number;
  date: Date;
  workerId: number;
  processId: number;
  sequence: number;
}

export class Snowflake {
  private readonly epoch: number;
  private readonly workerId: number;
  private readonly processId: number;
  private sequence: number;
  private lastMillisecond: number;

  constructor(options?: {
    epoch?: number;
    workerId?: number;
    processId?: number;
  }) {
    this.epoch = options?.epoch ?? 1738108800000; // 2025-01-29
    this.workerId = options?.workerId ?? 1;
    this.processId = options?.processId ?? 1;
    this.sequence = 0;
    this.lastMillisecond = -1;
  }

  private now(): number {
    return Date.now();
  }

  public nextId(): bigint {
    let currentMillisecond = this.now();

    if (currentMillisecond === this.lastMillisecond) {
      this.sequence = (this.sequence + 1) & 0xfff;
      if (this.sequence === 0) {
        while (currentMillisecond <= this.lastMillisecond) {
          currentMillisecond = this.now();
        }
      }
    } else {
      this.sequence = 0;
    }

    this.lastMillisecond = currentMillisecond;

    const timestampPart = BigInt(currentMillisecond - this.epoch) << 22n;
    const workerPart = BigInt(this.workerId & 0x1f) << 17n;
    const processPart = BigInt(this.processId & 0x1f) << 12n;
    const sequencePart = BigInt(this.sequence);

    return timestampPart | workerPart | processPart | sequencePart;
  }

  public parseId(id: string | bigint): ParsedSnowflake {
    const value = this.toBigInt(id);

    const timestamp = Number(value >> 22n) + this.epoch;
    const workerId = Number((value >> 17n) & 0x1fn);
    const processId = Number((value >> 12n) & 0x1fn);
    const sequence = Number(value & 0xfffn);

    return {
      timestamp,
      date: new Date(timestamp),
      workerId,
      processId,
      sequence,
    };
  }

  public getEpoch(): number {
    return this.epoch;
  }

  public toBigInt(id: string | bigint): bigint {
    try {
      return typeof id === 'bigint' ? id : BigInt(id);
    } catch {
      throw new Error(`Invalid Snowflake ID format: ${id}`);
    }
  }

  public isValid(id: string | bigint): boolean {
    try {
      const value = this.toBigInt(id);
      const timestamp = (value >> 22n) + BigInt(this.epoch);
      const now = BigInt(Date.now());
      return timestamp <= now + 60_000n; // <= now + 1 min
    } catch {
      return false;
    }
  }

  public compare(a: string | bigint, b: string | bigint): number {
    const idA = this.toBigInt(a);
    const idB = this.toBigInt(b);
    if (idA === idB) return 0;
    return idA > idB ? 1 : -1;
  }
}
