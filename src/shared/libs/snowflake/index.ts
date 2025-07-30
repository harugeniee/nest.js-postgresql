// src/libs/snowflake/index.ts
import { Snowflake } from './snowflake';

export const globalSnowflake = new Snowflake({
  epoch: 1738108800000, // 29/01/2025
  workerId: 1,
  processId: 1,
});
