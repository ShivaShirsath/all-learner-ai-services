import { Expose } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsUUID,
  IsArray,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvaluationType } from '../schemas/assessment-tracking.schema';

export class CreateAssessmentTrackingDto {
  @Expose()
  @IsOptional()
  @IsString()
  assessmentTrackingId?: string;

  @Expose()
  @IsOptional()
  createdOn?: Date;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Session Id',
  })
  @Expose()
  @IsOptional()
  @IsString()
  session_id?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Sub Session Id',
  })
  @Expose()
  @IsOptional()
  @IsString()
  sub_session_id?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Apply Level',
  })
  @Expose()
  @IsOptional()
  @IsString()
  apply_level?: string;

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Sub Apply Level',
  })
  @Expose()
  @IsOptional()
  @IsNumber()
  sub_apply_level?: number;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Course Id',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Content values',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  contentId: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Attempt Id',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  attemptId: string;

  @ApiPropertyOptional({
    type: Array,
    description: 'Assessment Summary',
    default: [],
  })
  @Expose()
  @IsArray()
  @IsNotEmpty()
  assessmentSummary: any[];

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Total max score values',
  })
  @Expose()
  @IsNumber()
  @IsNotEmpty()
  totalMaxScore: number;

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Total score values',
  })
  @Expose()
  @IsNumber()
  @IsNotEmpty()
  totalScore: number;

  @ApiPropertyOptional({
    type: () => Date,
    description: 'Last Attempted On',
  })
  @Expose()
  @IsOptional()
  lastAttemptedOn?: Date;

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Time Spent',
  })
  @Expose()
  @IsNumber()
  @IsNotEmpty()
  timeSpent: number;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Unit Id',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsOptional()
  showFlag?: boolean;

  @IsString()
  @IsOptional()
  submitedBy?: string;

  @IsEnum(EvaluationType)
  @IsOptional()
  evaluatedBy?: EvaluationType;

  @IsString()
  @IsOptional()
  tenantId?: string;

  constructor(obj?: Partial<CreateAssessmentTrackingDto>) {
    if (obj) {
      Object.assign(this, obj);
    }
  }
}

