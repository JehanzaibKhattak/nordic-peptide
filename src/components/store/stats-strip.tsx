"use client";

import { useEffect, useRef, useState } from "react";

type Stat = { value: number; suffix?: string; prefix?: string; label: string; decimals?: number; display?: string };

function CountUp({ value, decimals = 0, prefix = "", suffix = "", display }: Stat) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setStarted(true), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, value]);

  return (
    <span ref={ref} className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
      {display ?? `${prefix}${n.toFixed(decimals)}${suffix}`}
    </span>
  );
}

export function StatsStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-6 rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <CountUp {...s} />
          <p className="mt-1 text-xs uppercase tracking-wider opacity-80">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
