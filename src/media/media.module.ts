import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Media } from './entities/media.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { StorageModule } from 'src/shared/services/storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Media]), ConfigModule, StorageModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
