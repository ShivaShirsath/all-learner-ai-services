import { IsString, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CorrectPracticeWordDto {
  @ApiProperty()
  @IsString()
  original_text: string;

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

}

export class CreateCorrectPracticeWordDto {
  @ApiProperty({
    type: [CorrectPracticeWordDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorrectPracticeWordDto)
  correctPracticeWords: CorrectPracticeWordDto[];
} 