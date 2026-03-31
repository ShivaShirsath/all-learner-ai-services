import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { ScoresService } from './scores.service';
import { CreateScoreDto } from './dto/create-score.dto';
import { UpdateScoreDto } from './dto/update-score.dto';
import { FastifyReply } from 'fastify';
import { mapUnknownToHttpException } from '../common/exceptions/api.exceptions';

@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Post()
  async create(
    @Res() response: FastifyReply,
    @Body() createScoreDto: CreateScoreDto,
  ) {
    try {
      const data = await this.scoresService.create(createScoreDto);
      return response.status(HttpStatus.CREATED).send({
        status: 'success',
        message: 'Record created',
        data,
      });
    } catch (err) {
      throw mapUnknownToHttpException(err);
    }
  }

  @Get()
  async findAll(@Res() response: FastifyReply) {
    try {
      const data = await this.scoresService.findAll();
      return response.status(HttpStatus.OK).send(data);
    } catch (err) {
      throw mapUnknownToHttpException(err);
    }
  }

  @Get('/byuser/:id')
  async findByUser(@Res() response: FastifyReply, @Param('id') id: string) {
    try {
      const data = await this.scoresService.findByUser(id);
      return response.status(HttpStatus.OK).send(data);
    } catch (err) {
      throw mapUnknownToHttpException(err);
    }
  }

  @Get('/bysession/:id')
  async findBySession(@Res() response: FastifyReply, @Param('id') id: string) {
    try {
      const data = await this.scoresService.findBySession(id);
      return response.status(HttpStatus.OK).send(data);
    } catch (err) {
      throw mapUnknownToHttpException(err);
    }
  }

  @Get(':id')
  async findOne(@Res() response: FastifyReply, @Param('id') id: string) {
    try {
      const data = await this.scoresService.findOne(+id);
      return response.status(HttpStatus.OK).send(data);
    } catch (err) {
      throw mapUnknownToHttpException(err);
    }
  }

  @Patch(':id')
  async update(
    @Res() response: FastifyReply,
    @Param('id') id: string,
    @Body() updateScoreDto: UpdateScoreDto,
  ) {
    try {
      const data = await this.scoresService.update(+id, updateScoreDto);
      return response.status(HttpStatus.OK).send(data);
    } catch (err) {
      throw mapUnknownToHttpException(err);
    }
  }

  @Delete(':id')
  async remove(@Res() response: FastifyReply, @Param('id') id: string) {
    try {
      const data = await this.scoresService.remove(+id);
      return response.status(HttpStatus.OK).send(data);
    } catch (err) {
      throw mapUnknownToHttpException(err);
    }
  }
}
