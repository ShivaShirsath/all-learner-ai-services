import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Towre, TowreSchema } from '../schemas/towre.schema';
import { correct_practice_word, correct_practice_wordSchema } from '../schemas/correctPractice';
import { correct_vocabulary_word, correct_vocabulary_wordSchema } from '../schemas/correctRecalledWord';
import { TowreService } from './towre.service';
import { TowreController } from './towre.controller';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Towre.name, schema: TowreSchema },
      { name: correct_practice_word.name, schema: correct_practice_wordSchema },
      { name: correct_vocabulary_word.name, schema: correct_vocabulary_wordSchema },
    ]),
    HttpModule,
    ConfigModule.forRoot(),
  ],
  controllers: [TowreController],
  providers: [TowreService, JwtService],
})
export class TowreModule {}
