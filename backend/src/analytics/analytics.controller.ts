import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsOverviewQueryDto } from './dto/analytics-overview-query.dto';
import { LiveVisitorsQueryDto } from './dto/live-visitors-query.dto';
import { RecentActivityQueryDto } from './dto/recent-activity-query.dto';
import { TopProductsQueryDto } from './dto/top-products-query.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(
    @CurrentUser() user: AuthUser,
    @Query() query: AnalyticsOverviewQueryDto,
  ) {
    return this.analytics.overview(user.storeId, query);
  }

  @Get('top-products')
  topProducts(
    @CurrentUser() user: AuthUser,
    @Query() query: TopProductsQueryDto,
  ) {
    return this.analytics.topProducts(user.storeId, query);
  }

  @Get('recent-activity')
  recentActivity(
    @CurrentUser() user: AuthUser,
    @Query() query: RecentActivityQueryDto,
  ) {
    return this.analytics.recentActivity(user.storeId, query);
  }

  @Get('live-visitors')
  liveVisitors(
    @CurrentUser() user: AuthUser,
    @Query() query: LiveVisitorsQueryDto,
  ) {
    return this.analytics.liveVisitors(user.storeId, query);
  }
}
