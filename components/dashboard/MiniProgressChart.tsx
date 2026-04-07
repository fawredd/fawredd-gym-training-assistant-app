"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type DataPoint = {
  date: string;
  totalReps: number;
  totalWeight: number;
};

interface MiniProgressChartProps {
  data: DataPoint[];
  variant?: "volume" | "weight";
}

export default function MiniProgressChart({
  data,
  variant = "volume",
}: MiniProgressChartProps) {
  // Elegimos qué métrica mostrar
  const dataKey =
    variant === "volume" ? "totalWeight" : "totalReps";

  return (
    <div className="w-full h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Tooltip
            contentStyle={{ fontSize: "8px" }}
            labelStyle={{ display: "none" }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}