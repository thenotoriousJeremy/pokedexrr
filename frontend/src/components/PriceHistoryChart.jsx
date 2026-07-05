import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatPrice } from '../utils/formatPrice';

// Shared, properly-proportioned price-history chart. Replaces the two cramped
// copies (CollectionList inspector at 65px, Dashboard inspector at 50px) that
// clipped their axis labels. Give it real vertical room and let the YAxis
// reserve enough width for "$1,234" style ticks.
export default function PriceHistoryChart({
  data = [],
  loading = false,
  height = 150,
  title = 'Price History (30 Days)',
}) {
  const { pctChange, absChange } = useMemo(() => {
    if (!data || data.length < 2) return { pctChange: null, absChange: null };
    const first = data[0]?.price ?? 0;
    const last = data[data.length - 1]?.price ?? 0;
    const abs = last - first;
    const pct = first > 0 ? (abs / first) * 100 : 0;
    return { pctChange: pct, absChange: abs };
  }, [data]);

  if (loading) {
    return <div className="spinner" style={{ height: '30px', margin: '0.75rem auto' }} />;
  }
  if (!data || data.length === 0) return null;

  const up = (pctChange ?? 0) >= 0;
  const trendColor = up ? '#22c55e' : '#ef4444';

  return (
    <div style={{
      width: '100%',
      background: 'rgba(0,0,0,0.15)',
      padding: '0.75rem',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-glass)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {pctChange !== null && (
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: trendColor }}>
            {up ? '▲' : '▼'} {up ? '+' : ''}${formatPrice(Math.abs(absChange))} ({up ? '+' : '−'}{Math.abs(pctChange).toFixed(1)}%)
          </span>
        )}
      </div>
      <div style={{ width: '100%', height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-yellow)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent-yellow)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="recorded_at" hide />
            <YAxis
              domain={['auto', 'auto']}
              stroke="var(--text-secondary)"
              style={{ fontSize: '0.6rem' }}
              width={48}
              tickFormatter={(v) => `$${formatPrice(v)}`}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '0.75rem' }}
              labelStyle={{ color: 'var(--text-secondary)' }}
              formatter={(val) => [`$${formatPrice(val)}`, 'Market']}
              labelFormatter={(label) => (label ? new Date(label).toLocaleDateString() : '')}
            />
            <Area type="monotone" dataKey="price" stroke="var(--accent-yellow)" strokeWidth={1.75} fillOpacity={1} fill="url(#priceGlow)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
