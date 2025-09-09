import { IsString, IsOptional, IsArray, ValidateNested, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CorrectVocabularyWordDto {
  @ApiProperty()
  @IsString()
  original_text: string;

  @ApiProperty()
  @IsNumber()
  score: number;

  @ApiProperty()
  @IsString()
  content_id: string;

  @ApiProperty()
  @IsString()
  milestone_level: string;

  @ApiProperty()
  @IsString()
  practice_level: string;

  @ApiProperty()
  @IsString()
  session_id: string;

  @ApiProperty()
  @IsString()
  subsession_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdAt?: Date;
}

export class CreateCorrectVocabularyWordDto {
  @ApiProperty({
    type: [CorrectVocabularyWordDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorrectVocabularyWordDto)
  correctVocabularyWords: CorrectVocabularyWordDto[];
} 