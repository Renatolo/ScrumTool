
import { Task } from "@/types/task";
import { differenceInDays, eachDayOfInterval, format, isBefore, isAfter, isSameDay, parseISO } from "date-fns";

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
    
    // For actual: count points of tasks that were not completed before or on this date
    // Only include actual data up to today
    let actualRemaining = totalPoints;
    
    if (isBefore(date, today) || isSameDay(date, today)) {
      // Calculate actual remaining points for each day using the completedAt field
      actualRemaining = tasks.reduce((remaining, task) => {
        if (task.status === "done" && task.completedAt) {
          const completedDate = parseISO(task.completedAt);
          
          // If task was completed on or before the current day in the chart
          if (isBefore(completedDate, date) || isSameDay(completedDate, date)) {
            return remaining - (task.points || 0);
          }
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
