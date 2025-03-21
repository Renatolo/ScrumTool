
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSprintTasks } from "@/lib/supabase/tasks";
import { Task } from "@/types/task";
import { InfoIcon } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BurndownChartRenderer from "./BurndownChartRenderer";
import BurndownChartLoading from "./BurndownChartLoading";
import { BurndownDataPoint, getDefaultChartConfig, generateBurndownData } from "@/utils/burndownChartUtils";

interface BurndownChartProps {
  sprintId: string;
  sprintName: string;
  startDate: string;
  endDate: string;
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
        const data = generateBurndownData(tasks, total, startDate, endDate);
        setChartData(data);
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

  if (loading) {
    return <BurndownChartLoading />;
  }

  // Get chart configuration
  const chartConfig = getDefaultChartConfig();

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
        <BurndownChartRenderer 
          chartData={chartData} 
          totalPoints={totalPoints} 
          chartConfig={chartConfig} 
        />
      </CardContent>
    </Card>
  );
};

export default BurndownChart;
