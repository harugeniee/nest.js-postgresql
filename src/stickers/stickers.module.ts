import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Sticker } from './entities/sticker.entity';
import { StickerPack } from './entities/sticker-pack.entity';
import { StickerPackItem } from './entities/sticker-pack-item.entity';
import { StickersService } from './stickers.service';
import {
  StickersController,
  StickerPacksController,
} from './stickers.controller';
import { MediaModule } from 'src/media/media.module';
import { CacheModule } from 'src/shared/services/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sticker, StickerPack, StickerPackItem]),
    MediaModule,
    CacheModule,
    ConfigModule,
  ],
  controllers: [StickersController, StickerPacksController],
  providers: [StickersService],
  exports: [StickersService],
})
export class StickersModule {}
