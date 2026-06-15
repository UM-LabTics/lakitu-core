"use client";

import { useRef, useState, useEffect } from "react";
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
  return h * 3600 + m * 60 + Math.round(s);
}
// Para labels en el eje
function secondsToHHMM(secs: number): string {
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

type DataPoint = { x: number; y: number };

function buildSegments(occupancy: Record<string, number | string>): DataPoint[][] {
  const sorted = Object.entries(occupancy)
    .map(([time, val]) => ({ x: timeToSeconds(time), val }))
    .sort((a, b) => a.x - b.x);

  const segments: DataPoint[][] = [];
  let current: DataPoint[] = [];

  for (const { x, val } of sorted) {
    if (val === "N/D") {
      if (current.length > 0) {
        current.push({ x, y: current[current.length - 1].y });
        segments.push(current);
        current = [];
      }
    } else {
      const yVal = val as number;
      if (current.length === 0 || current[current.length - 1].y !== yVal) {
        current.push({ x, y: yVal });
      }
    }
  }
  if (current.length > 0) segments.push(current);

  const lastEntry = sorted.at(-1);
  if (segments.length > 0 && lastEntry?.val !== "N/D") {
    const lastSegment = segments[segments.length - 1];
    const lastPoint = lastSegment[lastSegment.length - 1];
    if (lastPoint.x < 86399) {
      lastSegment.push({ x: 86399, y: lastPoint.y });
    }
  }

  return segments;
}

function flattenWithGaps(segments: DataPoint[][]): Array<{ x: number; y: number | null }> {
  const result: Array<{ x: number; y: number | null }> = [];
  segments.forEach((seg, i) => {
    if (i > 0) result.push({ x: seg[0].x, y: null });
    seg.forEach((pt) => result.push(pt));
  });
  return result;
}

const MARGIN = { top: 20, right: 30, left: 10, bottom: 10 };

export default function OccupancyChart({ occupancy, size }: OccupancyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const segments = buildSegments(occupancy);
  const data = flattenWithGaps(segments);

  const gradientY1 = MARGIN.top;
  const gradientY2 = chartHeight - MARGIN.bottom;

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={MARGIN}>
          <defs>
            <linearGradient
              id="valueGradient"
              x1="0" y1={gradientY1}
              x2="0" y2={gradientY2}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor="#E09595" />
              <stop offset="50%"  stopColor="#F8EEB4" />
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
            label={{ value: "Time of Day", position: "insideBottom", offset: -5, fill: "#C6D2DC" }}
            stroke="#C6D2DC"
          />

          <YAxis
            domain={[0, size]}
            label={{ value: "Occupancy", angle: -90, position: "insideLeft", fill: "#C6D2DC" }}
            stroke="#C6D2DC"
          />

          <Tooltip
            labelFormatter={(val) => secondsToHHMM(val as number)}
            formatter={(val) => [val, "Occupancy"]}
          />

          <ReferenceLine
            y={size}
            stroke="#ef4444"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{ value: `Full (${size})`, position: "insideTopRight", fill: "#ef4444", fontSize: 12 }}
          />

          <Line
            dataKey="y"
            type="stepAfter"
            stroke="url(#valueGradient)"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}