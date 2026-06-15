"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

type OccupancyChartProps = {
  occupancy: Record<string, number | string>;
  size: number;
};

// Convertir a escalar para el eje x
function timeToSeconds(t: string): number {
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

// Para labels en el eje
function secondsToHHMM(secs: number): string {
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

type DataPoint = { x: number; y: number };

function buildSegments(
  occupancy: Record<string, number | string>
): DataPoint[][] {

  const sorted = Object.entries(occupancy)
    .map(([time, val]) => ({ x: timeToSeconds(time), val }))
    .sort((a, b) => a.x - b.x);

  const segments: DataPoint[][] = [];
  let current: DataPoint[] = [];

  for (const { x, val } of sorted) {
    if (val === "N/D") {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
    } else {
      current.push({ x, y: val as number });
    }
  }
  if (current.length > 0) segments.push(current);

  return segments;
}

function flattenWithGaps(segments: DataPoint[][]): Array<{ x: number; y: number | null }> {
  const result: Array<{ x: number; y: number | null }> = [];
  segments.forEach((seg, i) => {
    if (i > 0) result.push({ x: seg[0].x, y: null }); // gap
    seg.forEach((pt) => result.push(pt));
  });
  return result;
}

export default function OccupancyChart({ occupancy, size }: OccupancyChartProps) {
  const segments = buildSegments(occupancy);
  const data = flattenWithGaps(segments);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
        <defs>
          {/* 
            0%   = arriba - rojo      (y=size)
            50%  = medio  - amarillo  (y=size/2)  
            100% = abajo  - verde     (y=0)
          */}
          <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E09595" />
            <stop offset="50%" stopColor="#F8EEB4" />
            <stop offset="100%" stopColor="#92D77A" />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />

        <XAxis
          dataKey="x"
          type="number"
          domain={[0, 86399]}
          tickCount={13}
          tickFormatter={secondsToHHMM}
          label={{ value: "Time of Day", position: "insideBottom", offset: -5, fill:'#C6D2DC'  }}
          stroke='#C6D2DC'
        />

        <YAxis
          domain={[0, size]}
          label={{ value: "Occupancy", angle: -90, position: "insideLeft", fill:'#C6D2DC' }}
          stroke='#C6D2DC'
        />

        <Tooltip
          labelFormatter={(val) => secondsToHHMM(val as number)}
          formatter={(val) => [val, "Occupancy"]}
        />

        {/* Linea punteada de referencia en el maximo posible (tamaño del parking lot) */}
        <ReferenceLine
          y={size}
          stroke="#ef4444"
          strokeDasharray="6 4"
          strokeWidth={1.5}
          label={{ value: `Full (${size})`, position: "insideTopRight", fill: "#ef4444", fontSize: 12 }}
        />

        <Line
          dataKey="y"
          type="stepAfter"       // constante entre datos
          stroke="url(#valueGradient)"
          strokeWidth={2.5}
          dot={false}
          connectNulls={false}   // discontinua en N/D
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}