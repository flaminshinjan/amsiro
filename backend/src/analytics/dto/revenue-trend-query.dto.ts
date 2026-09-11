import { IsOptional, IsDateString, IsIn } from 'class-validator';

export class RevenueTrendQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  /** Granularity of each time bucket. Defaults to 'day'. */
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  granularity?: 'day' | 'week' | 'month';
}
