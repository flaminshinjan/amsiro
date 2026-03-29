import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

const EVENT_TYPES = [
  'page_view',
  'add_to_cart',
  'checkout_started',
  'purchase',
  'product_view',
] as const;

export class EventDataDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  session_id?: string;
}

export class CreateEventDto {
  @IsString()
  event_id!: string;

  @IsString()
  @IsIn([...EVENT_TYPES])
  event_type!: (typeof EVENT_TYPES)[number];

  @IsISO8601()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EventDataDto)
  data!: EventDataDto;
}
