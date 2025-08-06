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

  async addCorrectWords(user_id: string, data: CreateCorrectPracticeWordDto): Promise<correct_practice_word[]> {
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
    limit: number = 5
  ): Promise<any[]> {
    const latestWords = await this.correctPracticeWordModel
      .find({ user_id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    // Extract content IDs from the latest words
    const contentIds = latestWords.map(word => word.content_id);

    if (contentIds.length === 0) {
      return latestWords;
    }

    try {
      // Make API call to get content data
      const contentApiUrl = process.env.ALL_CONTENT_API + 'getByIds';
      const contentIdsString = contentIds.join(',');
      const response = await this.httpService.axiosRef.get(
        `${contentApiUrl}?ids=${contentIdsString}`,
        {
          headers: {
            Authorization: authHeader,
          },
        }
      );

      const contentData = response.data?.contents || []
      return contentData;
    } catch (error) {
      console.error('Error fetching content data:', error);
      return latestWords;
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
}
