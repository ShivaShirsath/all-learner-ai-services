import { Expose } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EvaluationType } from '../schemas/assessment-tracking.schema';

export class SearchAssessmentTrackingDto {
  @ApiPropertyOptional({
    type: () => String,
    description: 'Assessment Tracking Id',
  })
  @Expose()
  @IsOptional()
  @IsString()
  assessmentTrackingId?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'User Id',
  })
  @Expose()
  @IsOptional()
  @IsUUID(undefined, { message: 'User Id must be a valid UUID' })
  userId?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Course Id',
  })
  @Expose()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Content Id',
  })
  @Expose()
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Attempt Id',
  })
  @Expose()
  @IsOptional()
  @IsString()
  attemptId?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Unit Id',
  })
  @Expose()
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Tenant Id',
  })
  @Expose()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    enum: EvaluationType,
    description: 'Evaluation Type',
  })
  @Expose()
  @IsOptional()
  @IsEnum(EvaluationType)
  evaluatedBy?: EvaluationType;

  @ApiPropertyOptional({
    type: () => Boolean,
    description: 'Show Flag',
  })
  @Expose()
  @IsOptional()
  @IsBoolean()
  showFlag?: boolean;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Submitted By',
  })
  @Expose()
  @IsOptional()
  @IsString()
  submitedBy?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Created On - Start Date (ISO format)',
  })
  @Expose()
  @IsOptional()
  @IsDateString()
  createdOnStart?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Created On - End Date (ISO format)',
  })
  @Expose()
  @IsOptional()
  @IsDateString()
  createdOnEnd?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Last Attempted On - Start Date (ISO format)',
  })
  @Expose()
  @IsOptional()
  @IsDateString()
  lastAttemptedOnStart?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Last Attempted On - End Date (ISO format)',
  })
  @Expose()
  @IsOptional()
  @IsDateString()
  lastAttemptedOnEnd?: string;

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Minimum Total Score',
  })
  @Expose()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minTotalScore?: number;

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Maximum Total Score',
  })
  @Expose()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTotalScore?: number;

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Minimum Total Max Score',
  })
  @Expose()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minTotalMaxScore?: number;

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Maximum Total Max Score',
  })
  @Expose()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTotalMaxScore?: number;

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Minimum Time Spent',
  })
  @Expose()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minTimeSpent?: number;

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Maximum Time Spent',
  })
  @Expose()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTimeSpent?: number;

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Page number (for pagination)',
    default: 1,
  })
  @Expose()
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    type: () => Number,
    description: 'Limit per page (for pagination)',
    default: 10,
  })
  @Expose()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Sort field',
    default: 'createdOn',
  })
  @Expose()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: 'Sort order (asc or desc)',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @Expose()
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    type: Array,
    description: 'Array of User Ids',
  })
  @Expose()
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true, message: 'Each User Id must be a valid UUID' })
  userIds?: string[];

  @ApiPropertyOptional({
    type: Array,
    description: 'Array of Course Ids',
  })
  @Expose()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courseIds?: string[];

  @ApiPropertyOptional({
    type: Array,
    description: 'Array of Content Ids',
  })
  @Expose()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentIds?: string[];

  constructor(obj?: Partial<SearchAssessmentTrackingDto>) {
    if (obj) {
      Object.assign(this, obj);
    }
  }
}

