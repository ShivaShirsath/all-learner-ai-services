// src/towre/towre.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExcludeEndpoint,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TowreService } from './towre.service';
import { CreateTowreDto } from './dto/towre.dto';
import { CreateCorrectPracticeWordDto } from './dto/correctPracticeWord.dto';
import { CreateCorrectVocabularyWordDto } from './dto/correctRecalledWord.dto';
import { Towre } from '../schemas/towre.schema';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { FastifyReply, FastifyRequest } from 'fastify';

@UseGuards(JwtAuthGuard)
@ApiTags('towre')
@Controller('/api/towre')
export class TowreController {
  constructor(private readonly towreService: TowreService) {}

  @Post('/addRecord')
  @ApiOperation({ summary: 'Add a new TOWRE record' })
  @ApiBody({
    description: 'Payload for creating a TOWRE record',
    type: CreateTowreDto,
  })
  @ApiResponse({
    status: 201,
    description: 'TOWRE record created successfully',
    schema: {
      example: {
        status: 'success',
        message: 'Towre record created successfully',
        data: {
          towre_result: [
            {
              title: 'good',
              isCorrect: true,
            },    
          ],
          audio_file_path: '/audio/user123.wav',
          session_id: 'sess456',
          isDeleted: false,
          language: 'en',
          _id: '685a58aac9bce43089855549',
          createdAt: '2025-06-24T07:50:02.485Z',
          updatedAt: '2025-06-24T07:50:02.485Z',
          __v: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: {
        status: 'error',
        message: 'Server error - <error message>',
      },
    },
  })
  async addTowreRecord(
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
    @Body() dto: CreateTowreDto,
  ) {
    try {
      const user_id = (request as any).user.virtual_id.toString();
      const savedRecord = await this.towreService.createTowre(user_id, dto);
      const { user_id: _, ...responsedata } = savedRecord.toObject();
      return response.status(HttpStatus.CREATED).send({
        status: 'success',
        message: 'Towre record created successfully',
        data: responsedata,
      });
    } catch (err) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + err.message,
      });
    }
  }

  @Delete('/delete/:id')
  async softDeleteTowre(
    @Res() response: FastifyReply,
    @Param('id') id: string,
  ) {
    try {
      const result = await this.towreService.softDeleteById(id);
      if (!result) {
        return response.status(HttpStatus.NOT_FOUND).send({
          status: 'error',
          message: 'Record not found',
        });
      }
      return response.status(HttpStatus.OK).send({
        status: 'success',
        message: 'Record soft-deleted successfully',
        data: result,
      });
    } catch (err) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + err.message,
      });
    }
  }
  
  // Add correct data api.
  @Post('/addCorrectWord')
  @ApiOperation({ summary: 'Add correct practice words' })
  @ApiBody({
    type: CreateCorrectPracticeWordDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Correct practice words added successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async addCorrectWord(
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
    @Body() dto: CreateCorrectPracticeWordDto,
  ) {
    try {
      const user_id = (request as any).user.virtual_id.toString();
      const savedWords = await this.towreService.addCorrectWords(user_id, dto);
      return response.status(HttpStatus.CREATED).send({
        status: 'success',
        message: 'Correct practice words added successfully',
        data: savedWords,
      });
    } catch (err) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + err.message,
      });
    }
  }

  @Get('/getCorrectWords')
  @ApiOperation({ summary: 'Get latest 5 correct practice words' })
  @ApiResponse({
    status: 200,
    description: 'Latest correct practice words retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getCorrectWords(
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
  ) {
    try {
      const user_id = (request as any).user.virtual_id.toString();
      const authHeader = request.headers.authorization;
      const latestWords = await this.towreService.getLatestCorrectWords(user_id, authHeader);
      return response.status(HttpStatus.OK).send({
        status: 'success',
        message: 'Latest correct practice words retrieved successfully',
        data: latestWords,
      });
    } catch (err) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + err.message,
      });
    }
  }

  @Post('/addCorrectVocabularyWord')
  @ApiOperation({ summary: 'Add correct recalled words' })
  @ApiBody({
    type: CreateCorrectVocabularyWordDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Correct recalled words added successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async addCorrectVocabularyWord(
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
    @Body() dto: CreateCorrectVocabularyWordDto,
  ) {
    try {
      const user_id = (request as any).user.virtual_id.toString();
      const savedWords = await this.towreService.addCorrectVocabularyWord(user_id, dto);
      return response.status(HttpStatus.CREATED).send({
        status: 'success',
        message: 'Correct recalled words added successfully',
        data: savedWords,
      });
    } catch (err) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + err.message,
      });
    }
  }
}
