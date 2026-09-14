import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class RevenueTimeseriesQueryDto {
  /** ISO-8601 start date (inclusive) */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** ISO-8601 end date inclusive) */
  @IsOptional()
  @IsDateString()
  to?: string;

  /** Bucket granularity: day | week | month  (default: day) */
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  granularity?: 'day' | 'week' | 'month';
}
