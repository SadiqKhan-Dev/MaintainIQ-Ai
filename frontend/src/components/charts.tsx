"use client";

export interface Segment {
  label: string;
  value: number;
  color: string;
}

export function Donut({ segments, size = 160 }: { segments: Segment[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;

  const arcs = segments.reduce<{ i: number; len: number; offset: number; color: string }[]>(
    (acc, seg, i) => {
      const prevOffset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
      acc.push({
        i,
        len: total > 0 ? (seg.value / total) * circumference : 0,
        offset: prevOffset,
        color: seg.color,
      });
      return acc;
    },
    [],
  );

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-sm text-gray-400">No data</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef2f7" strokeWidth={14} />
        {arcs.map((a) => (
          <circle
            key={a.i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={a.color}
            strokeWidth={14}
            strokeDasharray={`${a.len} ${circumference - a.len}`}
            strokeDashoffset={-a.offset}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{total}</span>
        <span className="text-xs text-gray-400">Total</span>
      </div>
    </div>
  );
}

export function Legend({ segments }: { segments: Segment[] }) {
  return (
    <div className="space-y-1.5">
      {segments.map((s, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 capitalize">{s.label.replace(/_/g, " ")}</span>
          </div>
          <span className="font-medium text-gray-900">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

export function BarList({ items, max }: { items: { label: string; value: number; sub?: string; color?: string }[]; max: number }) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const pct = max > 0 ? Math.min(100, (it.value / max) * 100) : 0;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700 truncate">{it.label}</span>
              <span className="font-medium text-gray-900">{it.value}{it.sub ? <span className="text-gray-400 font-normal"> {it.sub}</span> : null}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: it.color || "#2563eb" }} />
            </div>
          </div>
        );
      })}
      {items.length === 0 && <p className="text-sm text-gray-400">Nothing to show</p>}
    </div>
  );
}
