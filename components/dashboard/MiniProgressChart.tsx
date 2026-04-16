"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type {TrainingProgress} from "../../lib/muscleGraphData";

interface MiniProgressChartProps {
  data: TrainingProgress[];
}

export default function MiniProgressChart({
  data,
}: MiniProgressChartProps) {
  // Elegimos qué métrica mostrar
  const dataKey = "totalMeasure"; // Puedes cambiar esto a "volume" o "intensity" según lo que quieras mostrar  
  
  return (
    <div className="w-full p-0 m-0">
      <ResponsiveContainer width="100%" height={20} className="min-w-0 bg-red p-0 m-0">
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