
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSprintTasks } from "@/lib/supabase/tasks";
import { Task } from "@/types/task";
import { format, eachDayOfInterval, isBefore, isAfter, isSameDay, differenceInDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Bar, ComposedChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

interface BurndownChartProps {
  sprintId: string;
  sprintName: string;
  startDate: string;
  endDate: string;
}

interface BurndownDataPoint {
  date: string;
  formattedDate: string;
  ideal: number;
  actual: number;
  remaining: number;
}

const BurndownChart = ({ sprintId, sprintName, startDate, endDate }: BurndownChartProps) => {
  const [chartData, setChartData] = useState<BurndownDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [remainingPoints, setRemainingPoints] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const tasks = await fetchSprintTasks(sprintId);
        
        // Calculate total story points
        const total = tasks.reduce((sum, task) => sum + (task.points || 0), 0);
        setTotalPoints(total);
        
        // Calculate remaining points (points in tasks not done)
        const remaining = tasks
          .filter(task => task.status !== "done")
          .reduce((sum, task) => sum + (task.points || 0), 0);
        setRemainingPoints(remaining);
        
        // Generate the burndown chart data
        generateBurndownData(tasks, total);
      } catch (error) {
        console.error("Error fetching burndown data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (sprintId) {
      fetchData();
    }
  }, [sprintId, startDate, endDate]);

  const generateBurndownData = (tasks: Task[], totalPoints: number) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    // Get all days in the sprint
    const allDays = eachDayOfInterval({ start, end });
    
    // Calculate the ideal burndown (linear decrease)
    const sprintDuration = differenceInDays(end, start) || 1;
    const idealBurndownPerDay = totalPoints / sprintDuration;
    
    // Prepare data for the chart
    const data: BurndownDataPoint[] = allDays.map((date, index) => {
      // For ideal: calculate based on days elapsed
      const daysElapsed = differenceInDays(date, start);
      const idealRemaining = Math.max(0, totalPoints - (daysElapsed * idealBurndownPerDay));
      
      // For actual: count points of tasks that were not done before or on this day
      // Only include actual data up to today
      let actualRemaining = totalPoints;
      
      if (isBefore(date, today) || isSameDay(date, today)) {
        // Calculate actual remaining points for each day
        // This is a simplification - in a real app, you'd track when tasks moved to Done
        actualRemaining = tasks.reduce((remaining, task) => {
          if (task.status === "done") {
            // In a real app, you would check when the task was completed
            // For this example, we'll assume a simple distribution
            return remaining - (task.points || 0) / sprintDuration * Math.min(daysElapsed + 1, sprintDuration);
          }
          return remaining;
        }, totalPoints);
      }
      
      return {
        date: date.toISOString(),
        formattedDate: format(date, "MM/dd"),
        ideal: Math.round(idealRemaining * 10) / 10,
        actual: isBefore(date, today) || isSameDay(date, today) 
          ? Math.round(actualRemaining * 10) / 10 
          : null, // Don't show actual data for future dates
        remaining: isBefore(date, today) || isSameDay(date, today) 
          ? Math.round(actualRemaining * 10) / 10 
          : null // Don't show remaining data for future dates
      };
    });
    
    setChartData(data);
  };

  if (loading) {
    return (
      <Card className="w-full mb-6">
        <CardContent className="p-4">
          <div className="h-[250px] flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    ideal: {
      label: "Ideal",
      theme: {
        light: "#9ca3af", // gray-400
        dark: "#6b7280"   // gray-500
      }
    },
    actual: {
      label: "Actual",
      theme: {
        light: "#3b82f6", // blue-500
        dark: "#60a5fa"   // blue-400
      }
    },
    remaining: {
      label: "Remaining",
      theme: {
        light: "#10b981", // emerald-500 
        dark: "#34d399"   // emerald-400
      }
    }
  };

  // Calculate completion percentage
  const completionPercentage = totalPoints > 0 
    ? Math.round(((totalPoints - remainingPoints) / totalPoints) * 100) 
    : 0;

  return (
    <Card className="w-full mb-6 border-2 border-muted hover:border-muted-foreground/20 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>Sprint Burndown</span>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>This chart shows the ideal vs. actual sprint progress. Bars represent remaining story points each day.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-sm font-normal">
              <span className="font-semibold">{remainingPoints}</span> of <span className="font-semibold">{totalPoints}</span> story points remaining
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[300px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="formattedDate" 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
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
                        {format(new Date(payload[0].payload.date), "EEEE, MMM d, yyyy")}
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
      </CardContent>
    </Card>
  );
};

export default BurndownChart;
