
import { format } from "date-fns";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine, 
  Bar, 
  ComposedChart 
} from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { BurndownDataPoint, ChartConfig as BurndownChartConfig } from "@/utils/burndownChartUtils";

interface BurndownChartRendererProps {
  chartData: BurndownDataPoint[];
  totalPoints: number;
  chartConfig: BurndownChartConfig;
  timeScale: 'day' | 'week' | 'sprint';
}

const BurndownChartRenderer = ({ 
  chartData, 
  totalPoints, 
  chartConfig,
  timeScale
}: BurndownChartRendererProps) => {
  // Convert our chart config to the format expected by the UI component
  const uiChartConfig: Record<string, any> = {};
  
  // Add each key from our config to the UI config with the proper format
  Object.keys(chartConfig).forEach(key => {
    uiChartConfig[key] = {
      label: chartConfig[key].label,
      theme: chartConfig[key].theme
    };
  });
  
  return (
    <div className="h-[300px]">
      <ChartContainer config={uiChartConfig} className="h-full w-full">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="formattedDate" 
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            interval={timeScale === 'day' ? (chartData.length > 30 ? Math.floor(chartData.length / 15) : 0) : 0}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            domain={[0, totalPoints > 0 ? totalPoints : 10]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              
              return (
                <ChartTooltipContent>
                  <div className="text-xs font-medium mb-2 border-b pb-1">
                    {timeScale === 'sprint' && payload[0].payload.sprintName ? (
                      <>
                        {payload[0].payload.sprintName} - {format(new Date(payload[0].payload.date), "MMM d, yyyy")}
                      </>
                    ) : (
                      format(new Date(payload[0].payload.date), "EEEE, MMM d, yyyy")
                    )}
                  </div>
                  {payload.map((entry, index) => {
                    if (entry.value === null) return null;
                    
                    let label = "";
                    if (entry.name === "ideal") label = "Ideal Remaining";
                    if (entry.name === "actual") label = "Actual Remaining";
                    if (entry.name === "remaining") label = "Story Points";
                    
                    return (
                      <div key={index} className="flex justify-between items-center w-full gap-4 py-0.5">
                        <span className="text-xs font-medium">{label}</span>
                        <span className="text-xs font-mono font-bold">{entry.value} points</span>
                      </div>
                    );
                  })}
                </ChartTooltipContent>
              );
            }}
          />
          <ReferenceLine y={0} stroke="#e5e7eb" />
          
          {/* Bar for remaining story points */}
          <Bar
            dataKey="remaining"
            fill="var(--color-remaining)"
            radius={[4, 4, 0, 0]}
            barSize={24}
            name="remaining"
            animationDuration={800}
            isAnimationActive={true}
          />
          
          {/* Ideal burndown line (dashed) */}
          <Line
            type="monotone"
            dataKey="ideal"
            strokeWidth={2}
            stroke="var(--color-ideal)"
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            isAnimationActive={true}
            animationDuration={1500}
            name="ideal"
          />
          
          {/* Actual burndown line */}
          <Line
            type="monotone"
            dataKey="actual"
            strokeWidth={2}
            stroke="var(--color-actual)"
            dot={{ r: 4, strokeWidth: 0, fill: "var(--color-actual)" }}
            activeDot={{ r: 5, strokeWidth: 1, stroke: "#fff" }}
            connectNulls={true}
            name="actual"
            isAnimationActive={true}
            animationDuration={1200}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
};

export default BurndownChartRenderer;
