import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionsModule } from 'src/reactions/reactions.module';
import { ReactionCount } from 'src/reactions/entities/reaction-count.entity';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { Character } from './entities/character.entity';
import { CharacterStaff } from './entities/character-staff.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Character, CharacterStaff, ReactionCount]),
    ReactionsModule,
  ],
  controllers: [CharactersController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}
