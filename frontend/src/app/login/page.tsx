"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, loginRequest, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@demo.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await loginRequest(email, password);
      setToken(r.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen transition-colors">
      {/* ─── left: brand panel ─── */}
      <div className="relative hidden w-[45%] overflow-hidden bg-[#0f3525] lg:block">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[#0a2419] to-transparent" />

        <div className="relative flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </div>
            <span className="text-[16px] font-bold tracking-tight text-white">amsiro</span>
          </div>

          <div>
            <div className="mb-8 flex items-end gap-1.5">
              {[40, 65, 45, 80, 60, 90, 72].map((h, i) => (
                <div key={i} className="w-4 rounded-t" style={{ height: `${h}px`, background: `rgba(46,204,113,${0.15 + i * 0.08})` }} />
              ))}
            </div>
            <p className="text-[28px] font-bold leading-[1.15] tracking-tight text-white">
              Real-time store<br />analytics that<br />
              <span className="text-[#2ECC71]">actually matter.</span>
            </p>
            <p className="mt-3 max-w-[300px] text-[13px] leading-relaxed text-white/40">
              Track revenue, conversions, and customer behavior across your stores — all in one dashboard.
            </p>

            <div className="mt-8 flex gap-6">
              <div>
                <p className="text-[20px] font-bold tabular-nums text-white">15s</p>
                <p className="text-[10px] uppercase tracking-wider text-white/30">Refresh rate</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <p className="text-[20px] font-bold tabular-nums text-white">5</p>
                <p className="text-[10px] uppercase tracking-wider text-white/30">Event types</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <p className="text-[20px] font-bold tabular-nums text-white">24/7</p>
                <p className="text-[10px] uppercase tracking-wider text-white/30">Monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── right: form ─── */}
      <div className="flex flex-1 flex-col bg-[var(--d-bg)]">
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-[340px]">
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B5E3F]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              </div>
              <span className="text-[14px] font-bold tracking-tight text-[var(--d-text)]">amsiro</span>
            </div>

            <h1 className="text-[24px] font-bold tracking-tight text-[var(--d-text)]">Welcome back</h1>
            <p className="mt-1 text-[13px] text-[var(--d-text-mid)]">Sign in to your analytics dashboard.</p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--d-text-dim)]">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--d-border-input)] bg-[var(--d-surface)] px-3.5 py-2.5 text-[13px] text-[var(--d-text)] outline-none transition placeholder:text-[var(--d-text-faint)] focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/10"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--d-text-dim)]">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--d-border-input)] bg-[var(--d-surface)] px-3.5 py-2.5 text-[13px] text-[var(--d-text)] outline-none transition placeholder:text-[var(--d-text-faint)] focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/10"
                  required
                />
              </div>
              {error && (
                <div className="rounded-lg border border-[var(--d-error-border)] bg-[var(--d-error-bg)] px-3 py-2 text-[12px] font-medium text-[var(--d-error-text)]">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-lg bg-[#1B5E3F] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#164D34] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in…
                  </span>
                ) : "Sign in"}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-2">
              <div className="h-px flex-1 bg-[var(--d-border)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--d-text-faint)]">demo</span>
              <div className="h-px flex-1 bg-[var(--d-border)]" />
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--d-text-dim)]">
              Credentials are pre-filled.<br />Just hit <strong className="text-[var(--d-text)]">Sign in</strong> to continue.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 text-center text-[10px] text-[var(--d-text-faint)]">
          amsiro — store analytics
        </div>
      </div>
    </div>
  );
}
