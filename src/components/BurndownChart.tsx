
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchProductBacklog } from "@/lib/supabase/tasks";
import { Task } from "@/types/task";
import { InfoIcon } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BurndownChartRenderer from "./BurndownChartRenderer";
import BurndownChartLoading from "./BurndownChartLoading";
import { BurndownDataPoint, getDefaultChartConfig, generateBurndownData } from "@/utils/burndownChartUtils";
import { fetchProjectSprints } from "@/lib/supabase/sprints";
import { Sprint } from "@/types/sprint";

interface BurndownChartProps {
  projectId: string;
  projectName: string;
}

const BurndownChart = ({ projectId, projectName }: BurndownChartProps) => {
  const [chartData, setChartData] = useState<BurndownDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [remainingPoints, setRemainingPoints] = useState(0);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all tasks for the project
        const tasks = await fetchProductBacklog(projectId);
        
        // Fetch all sprints to determine the project date range
        const sprints = await fetchProjectSprints(projectId);
        
        if (sprints.length > 0) {
          // Find the earliest start date and latest end date across all sprints
          const sortedByStart = [...sprints].sort((a, b) => 
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          );
          
          const sortedByEnd = [...sprints].sort((a, b) => 
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
          );
          
          setStartDate(sortedByStart[0].startDate);
          setEndDate(sortedByEnd[0].endDate);
          
          // Calculate total story points
          const total = tasks.reduce((sum, task) => sum + (task.points || 0), 0);
          setTotalPoints(total);
          
          // Calculate remaining points (points in tasks not done)
          const remaining = tasks
            .filter(task => task.status !== "done")
            .reduce((sum, task) => sum + (task.points || 0), 0);
          setRemainingPoints(remaining);
          
          // Generate the burndown chart data
          const data = generateBurndownData(tasks, total, sortedByStart[0].startDate, sortedByEnd[0].endDate);
          setChartData(data);
        } else {
          // If no sprints, use today as start and 2 weeks from now as end
          const today = new Date();
          const twoWeeksLater = new Date();
          twoWeeksLater.setDate(today.getDate() + 14);
          
          setStartDate(today.toISOString());
          setEndDate(twoWeeksLater.toISOString());
          
          // For empty projects, initialize with empty chart data with ideal line
          const total = tasks.reduce((sum, task) => sum + (task.points || 0), 0);
          setTotalPoints(total);
          
          const remaining = tasks
            .filter(task => task.status !== "done")
            .reduce((sum, task) => sum + (task.points || 0), 0);
          setRemainingPoints(remaining);
          
          // Generate empty chart data
          const data = generateBurndownData(tasks, total, today.toISOString(), twoWeeksLater.toISOString());
          setChartData(data);
        }
      } catch (error) {
        console.error("Error fetching burndown data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  if (loading) {
    return <BurndownChartLoading />;
  }

  // Get chart configuration
  const chartConfig = getDefaultChartConfig();

  // Calculate completion percentage
  const completionPercentage = totalPoints > 0 
    ? Math.round(((totalPoints - remainingPoints) / totalPoints) * 100) 
    : 0;

  // Placeholder message when no data exists
  const noDataMessage = (
    <div className="flex flex-col items-center justify-center h-[250px] text-center">
      <InfoIcon className="h-10 w-10 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">No Sprint Data Yet</h3>
      <p className="text-muted-foreground max-w-md">
        Create sprints and add tasks with story points to see your project burndown chart.
      </p>
    </div>
  );

  return (
    <Card className="w-full mb-6 border-2 border-muted hover:border-muted-foreground/20 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>Project Burndown</span>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>This chart shows the ideal vs. actual project progress across all sprints. Bars represent remaining story points each day.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          {totalPoints > 0 && (
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
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {chartData.length === 0 || totalPoints === 0 ? (
          noDataMessage
        ) : (
          <BurndownChartRenderer 
            chartData={chartData} 
            totalPoints={totalPoints} 
            chartConfig={chartConfig} 
          />
        )}
      </CardContent>
    </Card>
  );
};

export default BurndownChart;
