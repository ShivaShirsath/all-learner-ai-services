import { IsString, IsOptional, IsArray, ValidateNested, IsDateString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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

  @IsOptional()
  @IsBoolean()
  practiced?: boolean;

  @IsOptional()
  @IsBoolean()
  learned?: boolean;

  @IsOptional()
  @IsBoolean()
  understood?: boolean;

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