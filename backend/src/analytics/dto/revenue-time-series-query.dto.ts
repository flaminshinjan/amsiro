import { IsOptional, IsDateString, IsIn } from 'class-validator';

export class RevenueTimeSeriesQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  granularity?: 'day' | 'week' | 'month';
}
