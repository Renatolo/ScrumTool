
import { Task } from "@/types/task";
import { differenceInDays, eachDayOfInterval, format, isBefore, isAfter, isSameDay } from "date-fns";

export interface BurndownDataPoint {
  date: string;
  formattedDate: string;
  ideal: number;
  actual: number;
  remaining: number;
}

export interface ChartConfig {
  ideal: {
    label: string;
    theme: {
      light: string;
      dark: string;
    }
  };
  actual: {
    label: string;
    theme: {
      light: string;
      dark: string;
    }
  };
  remaining: {
    label: string;
    theme: {
      light: string;
      dark: string;
    }
  };
}

export const generateBurndownData = (
  tasks: Task[], 
  totalPoints: number, 
  startDate: string, 
  endDate: string
): BurndownDataPoint[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  
  // Get all days in the sprint
  const allDays = eachDayOfInterval({ start, end });
  
  // Calculate the ideal burndown (linear decrease)
  const sprintDuration = differenceInDays(end, start) || 1;
  const idealBurndownPerDay = totalPoints / sprintDuration;
  
  // Prepare data for the chart
  return allDays.map((date, index) => {
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
};

export const getDefaultChartConfig = (): ChartConfig => {
  return {
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
};
