"use client";

import { endOfDay, formatISO, parseISO, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useSWR from "swr";
import { apiGet, clearToken, getToken } from "@/lib/api";
import type {
  LiveVisitorsResponse,
  OverviewResponse,
  RecentActivityResponse,
  TopProductsResponse,
} from "@/lib/types";

const R = "rounded-[25px]";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(n);

const GREENS = ["#1B5E3F", "#2ECC71", "#27AE60", "#16A085", "#0E8A5F", "#45B97C", "#34D399"];

function titleCase(s: string) {
  return s.split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };
  return [dark, toggle] as const;
}

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", h, { passive: true });
    h();
    return () => window.removeEventListener("scroll", h);
  }, [threshold]);
  return scrolled;
}

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [dark, toggleDark] = useDark();
  const scrolled = useScrolled();
  const [filterOpen, setFilterOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rangeQuery, setRangeQuery] = useState<{ from: string; to: string }>();
  const popRef = useRef<HTMLDivElement>(null);

  const authed = mounted && !!getToken();

  useEffect(() => setMounted(true), []);
  useEffect(() => { if (mounted && !getToken()) router.replace("/login"); }, [mounted, router]);
  useEffect(() => {
    if (!filterOpen) return;
    const h = (e: MouseEvent) => { if (popRef.current && !popRef.current.contains(e.target as Node)) setFilterOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [filterOpen]);

  const qp = useMemo(() => (rangeQuery ? { from: rangeQuery.from, to: rangeQuery.to } : undefined), [rangeQuery]);
  const fetchOverview = useCallback(() => apiGet<OverviewResponse>("/analytics/overview", qp), [qp]);
  const fetchTop = useCallback(() => apiGet<TopProductsResponse>("/analytics/top-products", qp), [qp]);
  const fetchRecent = useCallback(() => apiGet<RecentActivityResponse>("/analytics/recent-activity"), []);
  const fetchLive = useCallback(() => apiGet<LiveVisitorsResponse>("/analytics/live-visitors"), []);

  const { data: ov, error: e1, isLoading: l1 } = useSWR(authed ? ["ov", qp] : null, fetchOverview, { refreshInterval: 30_000 });
  const { data: tp, error: e2, isLoading: l2 } = useSWR(authed ? ["tp", qp] : null, fetchTop, { refreshInterval: 60_000 });
  const { data: rc, error: e3, isLoading: l3 } = useSWR(authed ? "rc" : null, fetchRecent, { refreshInterval: 15_000 });
  const { data: lv, isLoading: l4 } = useSWR(authed ? "lv" : null, fetchLive, { refreshInterval: 15_000 });

  const logout = () => { clearToken(); router.replace("/login"); };
  const apply = () => {
    if (!fromDate || !toDate) return;
    const f = startOfDay(parseISO(fromDate));
    const t = endOfDay(parseISO(toDate));
    if (f > t) return;
    setRangeQuery({ from: formatISO(f), to: formatISO(t) });
    setFilterOpen(false);
  };
  const clear = () => { setFromDate(""); setToDate(""); setRangeQuery(undefined); setFilterOpen(false); };

  const revData = ov ? [
    { name: "Today", v: ov.revenue.today },
    { name: "Week", v: ov.revenue.week },
    { name: "Month", v: ov.revenue.month },
  ] : [];

  const pie = useMemo(() => {
    if (!ov) return [];
    return Object.entries(ov.events_by_type.month).filter(([, n]) => n > 0).map(([k, n]) => ({ name: titleCase(k), value: n, key: k }));
  }, [ov]);

  const bars = useMemo(() => mergedTypes(ov).map((r) => ({
    name: r.type.length > 12 ? titleCase(r.type).slice(0, 11) + "…" : titleCase(r.type),
    full: titleCase(r.type), today: r.today, week: r.week, month: r.month,
  })), [ov]);

  const err = e1 || e2 || e3;

  const tt: React.CSSProperties = {
    background: "var(--d-tt-bg)", border: "1px solid var(--d-tt-border)",
    borderRadius: 14, padding: "6px 10px", boxShadow: "var(--d-tt-shadow)", fontSize: 12, color: "var(--d-text)",
  };

  const badgeCls: Record<string, string> = {
    page_view: "bg-[var(--d-badge-page)] text-[var(--d-badge-page-text)]",
    product_view: "bg-[var(--d-badge-product)] text-[var(--d-badge-product-text)]",
    add_to_cart: "bg-[var(--d-badge-cart)] text-[var(--d-badge-cart-text)]",
    checkout_started: "bg-[var(--d-badge-checkout)] text-[var(--d-badge-checkout-text)]",
    purchase: "bg-[var(--d-badge-purchase)] text-[var(--d-badge-purchase-text)]",
  };

  const gridColor = dark ? "#1e1e1e" : "#f0f0f0";
  const axisColor = dark ? "#555" : "#999";
  const axisFaint = dark ? "#444" : "#bbb";

  return (
    <div className="min-h-screen bg-[var(--d-bg)] text-[var(--d-text)] transition-colors duration-200">
      {/* ─── nav ─── */}
      <nav className="sticky top-0 z-30 flex h-11 items-center justify-between px-4 transition-colors" style={{ background: "var(--d-nav-bg)", borderBottom: "1px solid var(--d-border)" }}>
        <span className="text-[13px] font-semibold tracking-tight">amsiro</span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={toggleDark} className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--d-border-input)] text-[var(--d-text-dim)] transition hover:text-[var(--d-text)]" aria-label="Toggle theme">
            {dark ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          <div className="relative" ref={popRef}>
            <button type="button" onClick={() => setFilterOpen((o) => !o)} className={`h-6 rounded-full border px-2.5 text-[11px] font-medium transition ${rangeQuery ? "border-[var(--d-filter-active-border)] bg-[var(--d-filter-active-bg)] text-[var(--d-filter-active-text)]" : "border-[var(--d-border-input)] text-[var(--d-text-mid)] hover:text-[var(--d-text)]"}`}>
              {rangeQuery ? "Filtered" : "Date range"}
            </button>
            {filterOpen && (
              <div className={`absolute right-0 top-full z-50 mt-1 w-[240px] ${R} border border-[var(--d-border)] bg-[var(--d-pop-bg)] p-3 shadow-[var(--d-pop-shadow)]`}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--d-text-dim)]">Filter dates</p>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mb-1 w-full rounded-xl border border-[var(--d-border-input)] bg-[var(--d-surface)] px-2.5 py-1.5 text-[11px] text-[var(--d-text)] outline-none focus:border-emerald-500" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mb-2 w-full rounded-xl border border-[var(--d-border-input)] bg-[var(--d-surface)] px-2.5 py-1.5 text-[11px] text-[var(--d-text)] outline-none focus:border-emerald-500" />
                <div className="flex gap-1">
                  <button type="button" onClick={apply} className="flex-1 rounded-xl bg-[#1B5E3F] py-1.5 text-[11px] font-medium text-white hover:bg-[#164D34]">Apply</button>
                  {rangeQuery && <button type="button" onClick={clear} className="rounded-xl border border-[var(--d-border-input)] px-3 py-1.5 text-[11px] text-[var(--d-text-mid)] hover:text-[var(--d-text)]">Clear</button>}
                </div>
                {ov?.between && (
                  <div className="mt-2 flex gap-2 rounded-xl bg-[var(--d-filter-active-bg)] px-2.5 py-2 text-[10px]">
                    <span><strong className="text-[var(--d-text)]">{fmt(ov.between.revenue)}</strong> <span className="text-[var(--d-text-dim)]">rev</span></span>
                    <span><strong className="text-[var(--d-text)]">{ov.between.conversion_rate == null ? "—" : fmtPct(ov.between.conversion_rate)}</strong> <span className="text-[var(--d-text-dim)]">conv</span></span>
                  </div>
                )}
              </div>
            )}
          </div>
          <button type="button" onClick={logout} className="h-6 rounded-full border border-[var(--d-border-input)] px-2.5 text-[11px] font-medium text-[var(--d-text-mid)] transition hover:text-[var(--d-text)]">Sign out</button>
        </div>
      </nav>

      {/* ─── sticky KPI bar — glass on scroll ─── */}
      <div
        className="sticky top-11 z-20 transition-all duration-300"
        style={{
          background: scrolled ? "var(--d-glass)" : "var(--d-bg)",
          backdropFilter: scrolled ? "blur(16px) saturate(1.5)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px) saturate(1.5)" : "none",
          borderBottom: `1px solid ${scrolled ? "var(--d-glass-border)" : "var(--d-border)"}`,
        }}
      >
        <div className="grid grid-cols-2 gap-2 px-3 py-2 lg:grid-cols-12">
          <div className={`col-span-2 flex flex-col justify-center ${R} bg-[var(--d-hero-bg)] px-5 py-3 text-white lg:col-span-4`}>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/50">This month</p>
            <p className="mt-0.5 text-[26px] font-extrabold leading-none tracking-tight">{l1 ? "—" : fmt(ov?.revenue.month ?? 0)}</p>
            <p className="mt-1 text-[10px] text-white/40">Total revenue</p>
          </div>
          <div className={`${R} border-l-[3px] border-l-[#2ECC71] bg-[var(--d-surface)] px-4 py-3 lg:col-span-2`}>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--d-text-dim)]">Today</p>
            <p className="mt-0.5 text-[18px] font-bold tabular-nums">{l1 ? "—" : fmt(ov?.revenue.today ?? 0)}</p>
          </div>
          <div className={`${R} border-l-[3px] border-l-[#27AE60] bg-[var(--d-surface)] px-4 py-3 lg:col-span-2`}>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--d-text-dim)]">This week</p>
            <p className="mt-0.5 text-[18px] font-bold tabular-nums">{l1 ? "—" : fmt(ov?.revenue.week ?? 0)}</p>
          </div>
          <div className={`${R} bg-[var(--d-surface)] px-4 py-3 lg:col-span-3`}>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--d-text-dim)]">Conversion</p>
            <div className="mt-1.5 space-y-1">
              {(["today", "week", "month"] as const).map((k) => {
                const r = ov?.conversion_rate[k];
                const val = l1 ? 0 : r ?? 0;
                return (
                  <div key={k} className="flex items-center gap-1.5">
                    <span className="w-9 text-[9px] capitalize text-[var(--d-text-dim)]">{k}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--d-bar-track)]">
                      <div className="h-full rounded-full bg-[#2ECC71] transition-all duration-500" style={{ width: `${Math.min(val * 100 * 5, 100)}%` }} />
                    </div>
                    <span className="w-9 text-right text-[11px] font-semibold tabular-nums">{l1 ? "—" : r == null ? "—" : fmtPct(r)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`flex flex-col items-center justify-center ${R} bg-[var(--d-live-bg)] px-3 py-3 text-white lg:col-span-1`}>
            <span className={`mb-0.5 inline-block h-2 w-2 rounded-full ${(lv?.count ?? 0) > 0 ? "animate-pulse bg-green-400 shadow-[0_0_8px_rgba(46,204,113,0.6)]" : "bg-[var(--d-live-dot-off)]"}`} />
            <span className="text-[16px] font-bold tabular-nums leading-none">{l4 ? "…" : lv?.count ?? 0}</span>
            <span className="mt-0.5 text-[8px] uppercase tracking-wider text-[var(--d-live-label)]">Live</span>
          </div>
        </div>
      </div>

      {/* ─── scroll hint chip ─── */}
      <div
        className={`scroll-hint fixed bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--d-border)] bg-[var(--d-surface)] px-5 py-2.5 shadow-xl ${scrolled ? "scroll-hint-hide" : "scroll-hint-show"}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#2ECC71]"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        <span className="text-[13px] font-medium text-[var(--d-text-mid)]">Scroll for more insights</span>
      </div>

      {/* ─── bento grid — full bleed ─── */}
      <div className="px-3 pb-4 pt-2">
        {err && (
          <div className={`mb-2 ${R} border border-[var(--d-error-border)] bg-[var(--d-error-bg)] px-4 py-2 text-[11px] text-[var(--d-error-text)]`}>
            {err instanceof Error ? err.message : String(err)}
          </div>
        )}

        {/* row 1+2: revenue (wide) + event mix (tall, narrow) */}
        <div className="mb-2 grid gap-2 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
          {/* revenue — col 1-8, row 1 */}
          <section className={`overflow-hidden ${R} bg-[var(--d-surface)] lg:col-span-8`}>
            <div className="h-1 bg-gradient-to-r from-[#1B5E3F] to-[#2ECC71]" />
            <div className="px-5 pb-4 pt-3">
              <p className="text-[12px] font-semibold">Revenue</p>
              <div className="mt-2 h-44">
                {!mounted || l1 ? <Skel /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#2ECC71" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: axisFaint, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                      <Tooltip contentStyle={tt} formatter={(v) => [fmt(typeof v === "number" ? v : Number(v ?? 0)), "Revenue"]} labelStyle={{ fontWeight: 600, color: "var(--d-text)", marginBottom: 2 }} cursor={{ stroke: gridColor }} />
                      <Area type="monotone" dataKey="v" stroke="#1B5E3F" strokeWidth={2} fill="url(#rg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          {/* event mix — col 9-12, row 1+2 (tall) */}
          <section className={`${R} bg-[var(--d-surface-mint)] px-4 pb-4 pt-3 lg:col-span-4 lg:row-span-2`}>
            <p className="text-[12px] font-semibold text-[var(--d-text-mint)]">Event mix <span className="font-normal text-[var(--d-text-mint-dim)]">this month</span></p>
            <div className="mt-2 h-[280px] lg:h-[calc(100%-28px)]">
              {!mounted || l1 ? <Skel /> : pie.length === 0 ? <Nil>No events yet.</Nil> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} cx="50%" cy="42%" innerRadius={40} outerRadius={68} paddingAngle={2} dataKey="value" nameKey="name">
                      {pie.map((_, i) => <Cell key={pie[i]!.key} fill={GREENS[i % GREENS.length]!} />)}
                    </Pie>
                    <Tooltip formatter={(v) => Number(v ?? 0).toLocaleString()} contentStyle={tt} />
                    <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => <span style={{ color: "var(--d-text-mint-legend)" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* events bars — col 1-8, row 2 */}
          <section className={`${R} bg-[var(--d-surface-dim)] p-4 lg:col-span-8`}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--d-text-dim)]">Events by type</p>
            <div className="h-40">
              {!mounted || l1 ? <Skel /> : bars.length === 0 ? <Nil>No data.</Nil> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} margin={{ top: 4, right: 4, left: -12, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} angle={-18} textAnchor="end" height={38} />
                    <YAxis tick={{ fill: axisFaint, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tt} formatter={(v) => Number(v ?? 0).toLocaleString()} labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="today" name="Today" fill="#2ECC71" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="week" name="Week" fill="#1B5E3F" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="month" name="Month" fill="#0E8A5F" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>

        {/* row 3: products (narrow) + activity (wide) */}
        <div className="grid gap-2 lg:grid-cols-12">
          <section className={`${R} bg-[var(--d-surface-dark)] p-4 text-white lg:col-span-5`}>
            <p className="text-[12px] font-semibold">Top products</p>
            <div className="mt-2.5">
              {l2 ? <Skel /> : (tp?.products ?? []).length === 0 ? (
                <p className="py-6 text-center text-[11px] text-white/30">No purchases.</p>
              ) : (
                <div className="space-y-1.5">
                  {(tp?.products ?? []).map((p, i) => {
                    const maxRev = tp!.products[0]!.revenue || 1;
                    const pctW = (p.revenue / maxRev) * 100;
                    return (
                      <div key={p.product_id} className="relative overflow-hidden rounded-2xl bg-[var(--d-prod-row)] px-3 py-2.5">
                        <div className="absolute inset-y-0 left-0 bg-[var(--d-prod-bar)]" style={{ width: `${pctW}%` }} />
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[16px] font-black tabular-nums text-[var(--d-prod-rank)]">{i + 1}</span>
                            <span className="text-[11px] font-medium">{p.product_id}</span>
                          </div>
                          <span className="text-[11px] font-bold tabular-nums text-[#2ECC71]">{fmt(p.revenue)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className={`${R} border border-[var(--d-border)] bg-[var(--d-surface)] p-4 lg:col-span-7`}>
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold">Activity</p>
              <span className="rounded-full bg-[var(--d-pill-bg)] px-2 py-0.5 text-[9px] font-medium text-[var(--d-pill-text)]">Live · 15s</span>
            </div>
            <div className="mt-2.5 max-h-[280px] overflow-y-auto">
              {l3 ? <Skel /> : (rc?.events ?? []).length === 0 ? (
                <Nil>No events. Hit <code className="rounded-lg bg-[var(--d-skel)] px-1 font-mono text-[10px]">/api/v1/events</code> or seed.</Nil>
              ) : (
                <div className="relative ml-2.5 border-l-2 border-[var(--d-timeline-line)] pl-3">
                  {(rc?.events ?? []).map((ev) => (
                    <div key={ev.event_id} className="relative pb-2.5 last:pb-0">
                      <span className="absolute -left-[17px] top-1 h-1.5 w-1.5 rounded-full border-2 border-[var(--d-timeline-dot-border)] bg-[var(--d-timeline-dot)]" />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-semibold leading-tight ${badgeCls[ev.event_type] ?? badgeCls.page_view}`}>{titleCase(ev.event_type)}</span>
                          <p className="mt-px truncate text-[11px] text-[var(--d-text-mid)]">{activityLine(ev.data)}</p>
                        </div>
                        <time className="shrink-0 pt-0.5 text-[9px] tabular-nums text-[var(--d-text-ghost)]">{shortTime(ev.timestamp)}</time>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Skel() {
  return <div className={`h-full min-h-[80px] w-full animate-pulse ${R} bg-[var(--d-skel)]`} />;
}
function Nil({ children }: { children: React.ReactNode }) {
  return <p className="flex h-full min-h-[80px] items-center justify-center text-[12px] text-[var(--d-text-faint)]">{children}</p>;
}

function activityLine(d: Record<string, unknown>) {
  const p: string[] = [];
  if (typeof d.product_id === "string") p.push(d.product_id);
  if (typeof d.amount === "number") {
    const c = typeof d.currency === "string" ? d.currency : "USD";
    p.push(new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(d.amount));
  }
  return p.length ? p.join(" · ") : "—";
}

function shortTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function mergedTypes(ov: OverviewResponse | undefined) {
  if (!ov) return [];
  const k = new Set<string>();
  for (const x of Object.keys(ov.events_by_type.today)) k.add(x);
  for (const x of Object.keys(ov.events_by_type.week)) k.add(x);
  for (const x of Object.keys(ov.events_by_type.month)) k.add(x);
  return Array.from(k).sort().map((t) => ({
    type: t,
    today: ov.events_by_type.today[t] ?? 0,
    week: ov.events_by_type.week[t] ?? 0,
    month: ov.events_by_type.month[t] ?? 0,
  }));
}
