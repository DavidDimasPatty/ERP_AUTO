'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface DataPoint {
  label: string;
  value: number;
}

interface SalesLineChartProps {
  title: string;
  subtitle: string;
  data: DataPoint[];
  color?: string;
}

const formatRupiah = (num: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    notation: 'compact',
    compactDisplay: 'short',
  } as Intl.NumberFormatOptions).format(num);

const formatRupiahFull = (num: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);

interface TooltipItem {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipItem) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          padding: '0.65rem 1rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          fontSize: '0.85rem',
        }}
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600 }}>
          {label}
        </p>
        <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1rem' }}>
          {formatRupiahFull(payload[0].value ?? 0)}
        </p>
      </div>
    );
  }
  return null;
}

export default function SalesLineChart({
  title,
  subtitle,
  data,
  color = 'var(--primary)',
}: SalesLineChartProps) {
  const chartData = data.map((d) => ({ name: d.label, value: d.value }));
  const gradientId = `lineGrad-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <div>
        <h3 style={{ fontSize: '1.2rem' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          {subtitle}
        </p>
      </div>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--success)" />
                <stop offset="100%" stopColor="var(--success)" />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 4"
              stroke="var(--border-color)"
              opacity={0.5}
              vertical={false}
            />

            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
            />

            <YAxis
              tickFormatter={(v) => formatRupiah(v)}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={72}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '4 4' }} />

            <Line
              type="monotone"
              dataKey="value"
              stroke={`url(#${gradientId})`}
              strokeWidth={3}
              dot={{
                r: 5,
                fill: 'var(--card-bg)',
                stroke: color,
                strokeWidth: 2.5,
              }}
              activeDot={{
                r: 7,
                fill: color,
                stroke: 'var(--card-bg)',
                strokeWidth: 2,
                style: { filter: 'drop-shadow(0 0 6px var(--primary))' },
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
