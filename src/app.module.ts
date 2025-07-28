import { createKeyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheableMemory } from 'cacheable';
import { Keyv } from 'keyv';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      // imports: [ConfigModule],
      // useClass: TypeOrmConfigService,
      // inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      useFactory: () => {
        const keyvOptions: any = {
          store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
        };

        return {
          stores: [new Keyv(keyvOptions), createKeyv('redis://localhost:6379')],
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
