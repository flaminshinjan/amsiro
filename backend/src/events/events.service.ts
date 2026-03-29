import { ConflictException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import type { DbEventType } from '../prisma/event-type';
import { CreateEventDto } from './dto/create-event.dto';

const TYPE_MAP: Record<CreateEventDto['event_type'], DbEventType> = {
  page_view: 'PAGE_VIEW',
  add_to_cart: 'ADD_TO_CART',
  checkout_started: 'CHECKOUT_STARTED',
  purchase: 'PURCHASE',
  product_view: 'PRODUCT_VIEW',
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateEventDto) {
    const existing = await this.prisma.event.findUnique({
      where: { eventId: dto.event_id },
    });
    if (existing) {
      if (existing.storeId !== storeId) {
        throw new ConflictException('event_id already exists');
      }
      return { id: existing.id, event_id: existing.eventId };
    }
    const occurredAt = new Date(dto.timestamp);
    const amount =
      dto.data.amount != null ? new Decimal(dto.data.amount) : null;
    const row = await this.prisma.event.create({
      data: {
        eventId: dto.event_id,
        storeId,
        eventType: TYPE_MAP[dto.event_type],
        occurredAt,
        amount,
        currency: dto.data.currency ?? null,
        productId: dto.data.product_id ?? null,
        sessionId: dto.data.session_id ?? null,
        payload: dto.data as object,
      },
    });
    return { id: row.id, event_id: row.eventId };
  }
}
