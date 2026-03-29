export type OverviewResponse = {
  revenue: { today: number; week: number; month: number };
  conversion_rate: {
    today: number | null;
    week: number | null;
    month: number | null;
  };
  events_by_type: {
    today: Record<string, number>;
    week: Record<string, number>;
    month: Record<string, number>;
  };
  between?: {
    from: string;
    to: string;
    revenue: number;
    conversion_rate: number | null;
    events_by_type: Record<string, number>;
  };
};

export type TopProductsResponse = {
  products: { product_id: string; revenue: number; currency: string }[];
};

export type RecentActivityResponse = {
  events: {
    event_id: string;
    event_type: string;
    timestamp: string;
    data: Record<string, unknown>;
  }[];
};

export type LiveVisitorsResponse = {
  count: number;
  window_minutes: number;
};
