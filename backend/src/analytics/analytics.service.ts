import { BadRequestException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import type { DbEventType } from '../prisma/event-type';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsOverviewQueryDto } from './dto/analytics-overview-query.dto';
import { LiveVisitorsQueryDto } from './dto/live-visitors-query.dto';
import { RecentActivityQueryDto } from './dto/recent-activity-query.dto';
import { TopProductsQueryDto } from './dto/top-products-query.dto';

function decToNum(v: Decimal | null | undefined): number {
  if (v == null) return 0;
  return Number(v);
}

function eventTypeToApi(t: DbEventType): string {
  return t.toLowerCase();
}

function utcDayStart(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function utcWeekStartMonday(d: Date): Date {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(storeId: string, query: AnalyticsOverviewQueryDto) {
    if ((query.from && !query.to) || (!query.from && query.to)) {
      throw new BadRequestException('from and to must be provided together');
    }
    if (query.from && query.to) {
      const from = new Date(query.from);
      const to = new Date(query.to);
      if (from > to) {
        throw new BadRequestException('from must be before or equal to to');
      }
      const maxMs = 366 * 24 * 60 * 60 * 1000;
      if (to.getTime() - from.getTime() > maxMs) {
        throw new BadRequestException('range must not exceed 366 days');
      }
    }

    const now = new Date();
    const todayStart = utcDayStart(now);
    const weekStart = utcWeekStartMonday(now);
    const monthStart = utcMonthStart(now);

    const [
      revToday,
      revWeek,
      revMonth,
      purchasesToday,
      purchasesWeek,
      purchasesMonth,
      viewsToday,
      viewsWeek,
      viewsMonth,
      typesToday,
      typesWeek,
      typesMonth,
    ] = await Promise.all([
      this.sumRevenue(storeId, todayStart, now),
      this.sumRevenue(storeId, weekStart, now),
      this.sumRevenue(storeId, monthStart, now),
      this.countByType(storeId, 'PURCHASE', todayStart, now),
      this.countByType(storeId, 'PURCHASE', weekStart, now),
      this.countByType(storeId, 'PURCHASE', monthStart, now),
      this.countByType(storeId, 'PAGE_VIEW', todayStart, now),
      this.countByType(storeId, 'PAGE_VIEW', weekStart, now),
      this.countByType(storeId, 'PAGE_VIEW', monthStart, now),
      this.countsByAllTypes(storeId, todayStart, now),
      this.countsByAllTypes(storeId, weekStart, now),
      this.countsByAllTypes(storeId, monthStart, now),
    ]);

    const conversion = (purchases: number, views: number) =>
      views === 0 ? null : purchases / views;

    const base = {
      revenue: {
        today: revToday,
        week: revWeek,
        month: revMonth,
      },
      conversion_rate: {
        today: conversion(purchasesToday, viewsToday),
        week: conversion(purchasesWeek, viewsWeek),
        month: conversion(purchasesMonth, viewsMonth),
      },
      events_by_type: {
        today: typesToday,
        week: typesWeek,
        month: typesMonth,
      },
    };

    if (!query.from || !query.to) {
      return base;
    }

    const from = new Date(query.from);
    const to = new Date(query.to);
    const [revBetween, purchBetween, viewBetween, typesBetween] =
      await Promise.all([
        this.sumRevenue(storeId, from, to),
        this.countByType(storeId, 'PURCHASE', from, to),
        this.countByType(storeId, 'PAGE_VIEW', from, to),
        this.countsByAllTypes(storeId, from, to),
      ]);

    return {
      ...base,
      between: {
        from: query.from,
        to: query.to,
        revenue: revBetween,
        conversion_rate: conversion(purchBetween, viewBetween),
        events_by_type: typesBetween,
      },
    };
  }

  async topProducts(storeId: string, query: TopProductsQueryDto) {
    let from: Date;
    let to: Date;
    if (query.from && query.to) {
      from = new Date(query.from);
      to = new Date(query.to);
      if (from > to) {
        throw new BadRequestException('from must be before or equal to to');
      }
    } else if (query.from || query.to) {
      throw new BadRequestException('from and to must be provided together');
    } else {
      to = new Date();
      from = new Date(to);
      from.setUTCDate(from.getUTCDate() - 30);
    }

    const rows = await this.prisma.event.groupBy({
      by: ['productId'],
      where: {
        storeId,
        eventType: 'PURCHASE',
        productId: { not: null },
        occurredAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    return {
      products: rows.map(
        (r: {
          productId: string | null;
          _sum: { amount: Decimal | null };
        }) => ({
          product_id: r.productId as string,
          revenue: decToNum(r._sum.amount),
          currency: 'USD',
        }),
      ),
    };
  }

  async recentActivity(storeId: string, query: RecentActivityQueryDto) {
    const limit = query.limit ?? 20;
    const rows = await this.prisma.event.findMany({
      where: { storeId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      select: {
        eventId: true,
        eventType: true,
        occurredAt: true,
        amount: true,
        currency: true,
        productId: true,
        payload: true,
      },
    });

    return {
      events: rows.map((e: (typeof rows)[number]) => {
        const fromPayload =
          e.payload != null &&
          typeof e.payload === 'object' &&
          !Array.isArray(e.payload)
            ? { ...(e.payload as Record<string, unknown>) }
            : {};
        return {
          event_id: e.eventId,
          event_type: eventTypeToApi(e.eventType),
          timestamp: e.occurredAt.toISOString(),
          data: {
            ...fromPayload,
            ...(e.productId != null ? { product_id: e.productId } : {}),
            ...(e.amount != null
              ? { amount: decToNum(e.amount), currency: e.currency }
              : {}),
          },
        };
      }),
    };
  }

  async liveVisitors(storeId: string, query: LiveVisitorsQueryDto) {
    const windowMinutes = query.windowMinutes ?? 5;
    const since = new Date();
    since.setUTCMinutes(since.getUTCMinutes() - windowMinutes);

    const result = await this.prisma.event.groupBy({
      by: ['sessionId'],
      where: {
        storeId,
        sessionId: { not: null },
        occurredAt: { gte: since },
      },
      _count: { _all: true },
    });

    return {
      count: result.length,
      window_minutes: windowMinutes,
    };
  }

  private async sumRevenue(storeId: string, from: Date, to: Date) {
    const agg = await this.prisma.event.aggregate({
      where: {
        storeId,
        eventType: 'PURCHASE',
        occurredAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });
    return decToNum(agg._sum.amount);
  }

  private async countByType(
    storeId: string,
    eventType: Extract<DbEventType, 'PURCHASE' | 'PAGE_VIEW'>,
    from: Date,
    to: Date,
  ) {
    return this.prisma.event.count({
      where: { storeId, eventType, occurredAt: { gte: from, lte: to } },
    });
  }

  private async countsByAllTypes(storeId: string, from: Date, to: Date) {
    const rows = await this.prisma.event.groupBy({
      by: ['eventType'],
      where: { storeId, occurredAt: { gte: from, lte: to } },
      _count: { _all: true },
    });
    const out: Record<string, number> = {};
    for (const r of rows) {
      out[eventTypeToApi(r.eventType)] = r._count._all;
    }
    return out;
  }
}
