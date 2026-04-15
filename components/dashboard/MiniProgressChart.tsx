"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type DataPoint = {
  column: number;
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
    <div className="w-full min-h-20px h-[20px] p-0 m-0">
      <ResponsiveContainer width="100%" height="100%" className="min-w-0 bg-red p-0 m-0">
{/*         <LineChart data={data}>
          <Line
            type="monotone"
            dataKey={dataKey}
            strokeWidth={2}
            dot={true}
            isAnimationActive={true}
          />
        </LineChart>
 */}      
         <BarChart data={data}>
          <Bar
            dataKey={dataKey}
            strokeWidth={2}
            isAnimationActive={true}
          />
        </BarChart>

 </ResponsiveContainer>
    </div>
  );
}