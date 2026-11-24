import { Module } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ScoreSchema } from './schemas/scores.schema';
import { hexcodeMappingSchema } from './schemas/hexcodeMapping.schema';
import { assessmentInputSchema } from './schemas/assessmentInput.schema';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';
import { CacheService } from './cache/cache.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { llmOutputLogsSchema } from './schemas/llmOutputLogs';
import { getSetResultSchema } from './schemas/getSetResult';
import { TowreSchema } from 'src/schemas/towre.schema';
import { VocabularySchema } from './schemas/vocabularySchema';
import { correct_practice_wordSchema } from '../schemas/correctPractice';
import { AssessmentTrackingSchema, AssessmentTrackingScoreDetailSchema } from './schemas/assessment-tracking.schema';


@Module({
  imports: [
    HttpModule.register({
      // Same 5 s default as before; tunable per environment.
      timeout: parseInt(process.env.HTTP_CLIENT_TIMEOUT_MS, 10) || 5000,
      // Reuse connections to text-eval / content-service / LLM. Node 16 has
      // no keep-alive by default, so every call opened a new TCP connection.
      httpAgent: new http.Agent({ keepAlive: true, maxSockets: 256 }),
      httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 256 }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      useFactory: async () => ({
        uri: process.env.MONGO_URL,
        // Pool size is PER PROCESS. Total connections to MongoDB =
        // POOL_SIZE x cluster workers (WORKERS) x pods. Large values do not add
        // throughput; they let more heavy aggregations run at once on MongoDB.
        maxPoolSize: parseInt(process.env.POOL_SIZE, 10) || 50,
        minPoolSize: parseInt(process.env.MIN_POOL_SIZE, 10) || 5,
        waitQueueTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
      }),
    }),

    MongooseModule.forFeature([
      { name: 'Score', schema: ScoreSchema },
      { name: 'hexcodeMapping', schema: hexcodeMappingSchema },
      { name: 'assessmentInput', schema: assessmentInputSchema },
      { name: 'llmOutputLogs', schema: llmOutputLogsSchema },
      { name: 'getSetResult', schema: getSetResultSchema },
      { name: 'towre', schema: TowreSchema},
      { name: 'vocabulary', schema: VocabularySchema},
      { name: 'correct_practice_word', schema: correct_practice_wordSchema},
      { name: 'AssessmentTracking', schema: AssessmentTrackingSchema },
      { name: 'AssessmentTrackingScoreDetail', schema: AssessmentTrackingScoreDetailSchema }
    ]),
    CacheModule.register()
  ],
  controllers: [ScoresController],
  providers: [ScoresService, CacheService, JwtService],
})
export class MongodbModule {}