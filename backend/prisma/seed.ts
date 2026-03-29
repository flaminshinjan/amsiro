import { Prisma, PrismaClient, EventType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const storeA = await prisma.store.create({
    data: { name: 'Northwind Traders' },
  });
  const storeB = await prisma.store.create({
    data: { name: 'Contoso Goods' },
  });

  await prisma.user.create({
    data: {
      email: 'owner@demo.com',
      passwordHash,
      storeId: storeA.id,
    },
  });
  await prisma.user.create({
    data: {
      email: 'other@demo.com',
      passwordHash,
      storeId: storeB.id,
    },
  });

  const products = ['prod_100', 'prod_200', 'prod_300', 'prod_400', 'prod_500'];
  const sessions = ['sess_a1', 'sess_a2', 'sess_a3', 'sess_b1', 'sess_b2'];

  type Row = {
    eventId: string;
    storeId: string;
    eventType: EventType;
    occurredAt: Date;
    amount: Prisma.Decimal | null;
    currency: string | null;
    productId: string | null;
    sessionId: string | null;
    payload: object;
  };

  const rowsA: Row[] = [];
  const rowsB: Row[] = [];

  let seq = 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let d = 0; d < 90; d++) {
    const dayStart = now - d * dayMs;
    const n = 40 + Math.floor(Math.random() * 80);
    for (let i = 0; i < n; i++) {
      seq += 1;
      const occurredAt = new Date(dayStart - Math.floor(randomBetween(0, dayMs)));
      const sessionId = randomItem(sessions);
      const t = Math.random();
      let eventType: EventType;
      let amount: Prisma.Decimal | null = null;
      let currency: string | null = null;
      let productId: string | null = null;
      if (t < 0.55) {
        eventType = EventType.PAGE_VIEW;
      } else if (t < 0.72) {
        eventType = EventType.PRODUCT_VIEW;
        productId = randomItem(products);
      } else if (t < 0.82) {
        eventType = EventType.ADD_TO_CART;
        productId = randomItem(products);
      } else if (t < 0.88) {
        eventType = EventType.CHECKOUT_STARTED;
      } else {
        eventType = EventType.PURCHASE;
        productId = randomItem(products);
        amount = new Prisma.Decimal(randomBetween(9.99, 299.99).toFixed(2));
        currency = 'USD';
      }

      const payload: Record<string, unknown> = {};
      if (productId) payload.product_id = productId;
      if (amount != null) {
        payload.amount = Number(amount);
        payload.currency = currency;
      }

      rowsA.push({
        eventId: `seed_a_${seq}`,
        storeId: storeA.id,
        eventType,
        occurredAt,
        amount,
        currency,
        productId,
        sessionId,
        payload,
      });
    }
  }

  for (let d = 0; d < 30; d++) {
    const dayStart = now - d * dayMs;
    const n = 20 + Math.floor(Math.random() * 40);
    for (let i = 0; i < n; i++) {
      seq += 1;
      const occurredAt = new Date(dayStart - Math.floor(randomBetween(0, dayMs)));
      const sessionId = randomItem(sessions);
      const t = Math.random();
      let eventType: EventType;
      let amount: Prisma.Decimal | null = null;
      let currency: string | null = null;
      let productId: string | null = null;
      if (t < 0.6) {
        eventType = EventType.PAGE_VIEW;
      } else if (t < 0.78) {
        eventType = EventType.PRODUCT_VIEW;
        productId = randomItem(products);
      } else if (t < 0.88) {
        eventType = EventType.ADD_TO_CART;
        productId = randomItem(products);
      } else if (t < 0.93) {
        eventType = EventType.CHECKOUT_STARTED;
      } else {
        eventType = EventType.PURCHASE;
        productId = randomItem(products);
        amount = new Prisma.Decimal(randomBetween(5, 149.99).toFixed(2));
        currency = 'USD';
      }
      const payload: Record<string, unknown> = {};
      if (productId) payload.product_id = productId;
      if (amount != null) {
        payload.amount = Number(amount);
        payload.currency = currency;
      }
      rowsB.push({
        eventId: `seed_b_${seq}`,
        storeId: storeB.id,
        eventType,
        occurredAt,
        amount,
        currency,
        productId,
        sessionId,
        payload,
      });
    }
  }

  const chunk = 500;
  for (let i = 0; i < rowsA.length; i += chunk) {
    await prisma.event.createMany({ data: rowsA.slice(i, i + chunk) });
  }
  for (let i = 0; i < rowsB.length; i += chunk) {
    await prisma.event.createMany({ data: rowsB.slice(i, i + chunk) });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
