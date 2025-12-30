import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeyValueService } from './key-value.service';
import { KeyValueController } from './key-value.controller';
import { KeyValue } from './entities/key-value.entity';
import { CacheService } from 'src/shared/services';

/**
 * Key-Value Store Module
 *
 * Provides flexible key-value storage functionality with TTL support,
 * namespacing, and caching capabilities.
 */
@Module({
  imports: [TypeOrmModule.forFeature([KeyValue])],
  controllers: [KeyValueController],
  providers: [KeyValueService, CacheService],
  exports: [KeyValueService],
})
export class KeyValueModule {}
