import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Towre, TowreDocument } from '../schemas/towre.schema';
import { correct_practice_word, correct_practice_wordDocument } from '../schemas/correctPractice';
import { correct_vocabulary_word, correct_vocabulary_wordDocument } from '../schemas/correctRecalledWord';
import { CreateTowreDto } from './dto/towre.dto';
import { CreateCorrectPracticeWordDto } from './dto/correctPracticeWord.dto';
import { CreateCorrectVocabularyWordDto } from './dto/correctRecalledWord.dto';
import {
  ErrorCodes,
  mapAxiosToUpstreamHttpException,
} from '../common/exceptions/api.exceptions';

@Injectable()
export class TowreService {
  constructor(
    @InjectModel(Towre.name) private towreModel: Model<TowreDocument>,
    @InjectModel(correct_practice_word.name) private correctPracticeWordModel: Model<correct_practice_wordDocument>,
    @InjectModel(correct_vocabulary_word.name) private correctVocabularyWordModel: Model<correct_vocabulary_wordDocument>,
    private configService: ConfigService,
    private httpService: HttpService
  ) { }

  async createTowre(user_id: string, data: CreateTowreDto): Promise<Towre> {
    const created = new this.towreModel({
      ...data,
      user_id
    });
    return created.save();
  }

  async softDeleteById(id: string): Promise<any> {
    return this.towreModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
  }

  async addCorrectWords(user_id: string, data: CreateCorrectPracticeWordDto): Promise<correct_practice_wordDocument[]> {
    const wordsWithUserId = data.correctPracticeWords.map(word => ({
      ...word,
      user_id
    }));
    const createdWords = await this.correctPracticeWordModel.insertMany(wordsWithUserId);
    return createdWords;
  }

  async getLatestCorrectWords(
    user_id: string,
    authHeader?: string,
    limit: number = 5,
    filters?: { practiced?: boolean; learned?: boolean; understood?: boolean }
  ): Promise<any[]> {
    const query: any = { user_id };

    if (filters) {
      if (filters.practiced !== undefined) query.practiced = filters.practiced;
      if (filters.learned !== undefined) query.learned = filters.learned;
      if (filters.understood !== undefined) query.understood = filters.understood;
    }
    const latestWords = await this.correctPracticeWordModel
      .aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$content_id', latestRecord: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$latestRecord' } },
        { $limit: limit }
      ])
      .exec();
    const contentIds = latestWords.map(word => word.content_id);

    if (contentIds.length === 0) {
      return latestWords;
    }

    try {
      const contentApiUrl = process.env.ALL_CONTENT_API + 'getByIds';
      const contentIdsString = contentIds.join(',');
      const response = await this.httpService.axiosRef.get(
        `${contentApiUrl}?ids=${contentIdsString}`,
        {
          headers: { Authorization: authHeader },
        }
      );

      return response.data?.contents || [];
    } catch (error) {
      console.error('Error fetching content data:', error);
      throw mapAxiosToUpstreamHttpException(
        'content-service',
        ErrorCodes.CONTENT_SERVICE_UNAVAILABLE,
        'Content service is unavailable or could not load content details for practice words.',
        error,
      );
    }
  }


  async addCorrectVocabularyWord(user_id: string, data: CreateCorrectVocabularyWordDto) {
    const wordsWithUserId = data.correctVocabularyWords.map(word => ({
      ...word,
      user_id
    }));
    const createdWords = await this.correctVocabularyWordModel.insertMany(wordsWithUserId);
    return createdWords;
  }

  async bulkUpdateCorrectWords(
    user_id: string,
    updates: Array<{ content_id: string; practiced?: boolean; learned?: boolean; understood?: boolean }>
  ): Promise<{ updatedContentIds: string[] }> {
    const updatedContentIds: string[] = [];

    for (const update of updates) {
      const updateData: any = {};

      if (update.practiced !== undefined) updateData.practiced = update.practiced;
      if (update.learned !== undefined) updateData.learned = update.learned;
      if (update.understood !== undefined) updateData.understood = update.understood;

      if (Object.keys(updateData).length > 0) {
        const result = await this.correctPracticeWordModel.updateMany(
          { user_id, content_id: update.content_id },
          { $set: updateData }
        );

        if (result.modifiedCount > 0) {
          updatedContentIds.push(update.content_id);
        }
      }
    }

    return { updatedContentIds };
  }
}
