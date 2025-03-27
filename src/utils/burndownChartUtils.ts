
import { Task } from "@/types/task";
import { Sprint } from "@/types/sprint";
import { 
  differenceInDays, 
  eachDayOfInterval, 
  eachWeekOfInterval,
  format, 
  isBefore, 
  isAfter, 
  isSameDay,
  isSameWeek,
  parseISO,
  startOfWeek,
  endOfWeek
} from "date-fns";

export interface BurndownDataPoint {
  date: string;
  formattedDate: string;
  ideal: number;
  actual: number;
  remaining: number;
  sprintName?: string; // For sprint-based charts
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
  endDate: string,
  timeScale: 'day' | 'week' | 'sprint' = 'day',
  sprints: Sprint[] = []
): BurndownDataPoint[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  
  if (timeScale === 'day') {
    return generateDailyBurndownData(tasks, totalPoints, start, end, today);
  } else if (timeScale === 'week') {
    return generateWeeklyBurndownData(tasks, totalPoints, start, end, today);
  } else {
    return generateSprintBurndownData(tasks, totalPoints, start, end, today, sprints);
  }
};

const generateDailyBurndownData = (
  tasks: Task[],
  totalPoints: number,
  start: Date,
  end: Date,
  today: Date
): BurndownDataPoint[] => {
  // Get all days in the project
  const allDays = eachDayOfInterval({ start, end });
  
  // Calculate the ideal burndown (linear decrease)
  const projectDuration = differenceInDays(end, start) || 1;
  const idealBurndownPerDay = totalPoints / projectDuration;
  
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

const generateWeeklyBurndownData = (
  tasks: Task[],
  totalPoints: number,
  start: Date,
  end: Date,
  today: Date
): BurndownDataPoint[] => {
  // Get all weeks in the project
  const allWeeks = eachWeekOfInterval({ start, end });
  
  // Calculate the ideal burndown (linear decrease)
  const projectDurationWeeks = allWeeks.length || 1;
  const idealBurndownPerWeek = totalPoints / projectDurationWeeks;
  
  // Prepare data for the chart
  return allWeeks.map((weekStart, index) => {
    const weekEnd = endOfWeek(weekStart);
    
    // For ideal: calculate based on weeks elapsed
    const idealRemaining = Math.max(0, totalPoints - (index * idealBurndownPerWeek));
    
    // For actual: count points of tasks that were not completed before or on this week
    // Only include actual data up to current week
    let actualRemaining = totalPoints;
    
    if (isBefore(weekEnd, today) || isSameWeek(weekEnd, today)) {
      // Calculate actual remaining points for each week using the completedAt field
      actualRemaining = tasks.reduce((remaining, task) => {
        if (task.status === "done" && task.completedAt) {
          const completedDate = parseISO(task.completedAt);
          
          // If task was completed on or before the current week in the chart
          if (isBefore(completedDate, weekEnd) || isSameDay(completedDate, weekEnd)) {
            return remaining - (task.points || 0);
          }
        }
        return remaining;
      }, totalPoints);
    }
    
    return {
      date: weekStart.toISOString(),
      formattedDate: `Week ${index + 1}`,
      ideal: Math.round(idealRemaining * 10) / 10,
      actual: isBefore(weekEnd, today) || isSameWeek(weekEnd, today) 
        ? Math.round(actualRemaining * 10) / 10 
        : null, // Don't show actual data for future weeks
      remaining: isBefore(weekEnd, today) || isSameWeek(weekEnd, today) 
        ? Math.round(actualRemaining * 10) / 10 
        : null // Don't show remaining data for future weeks
    };
  });
};

const generateSprintBurndownData = (
  tasks: Task[],
  totalPoints: number,
  start: Date,
  end: Date,
  today: Date,
  sprints: Sprint[]
): BurndownDataPoint[] => {
  // If we don't have any sprints, fall back to weekly
  if (!sprints.length) {
    return generateWeeklyBurndownData(tasks, totalPoints, start, end, today);
  }
  
  // Sort sprints by start date
  const sortedSprints = [...sprints].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  
  // Calculate the ideal burndown (linear decrease)
  const projectDurationSprints = sortedSprints.length || 1;
  const idealBurndownPerSprint = totalPoints / projectDurationSprints;
  
  // Prepare data for the chart
  return sortedSprints.map((sprint, index) => {
    const sprintEnd = new Date(sprint.endDate);
    
    // For ideal: calculate based on sprints elapsed
    const idealRemaining = Math.max(0, totalPoints - (index * idealBurndownPerSprint));
    
    // For actual: count points of tasks that were not completed before or on this sprint
    // Only include actual data up to current sprint
    let actualRemaining = totalPoints;
    
    if (isBefore(sprintEnd, today) || isSameDay(sprintEnd, today)) {
      // Calculate actual remaining points for each sprint using the completedAt field
      actualRemaining = tasks.reduce((remaining, task) => {
        if (task.status === "done" && task.completedAt) {
          const completedDate = parseISO(task.completedAt);
          
          // If task was completed on or before the end of this sprint
          if (isBefore(completedDate, sprintEnd) || isSameDay(completedDate, sprintEnd)) {
            return remaining - (task.points || 0);
          }
        }
        return remaining;
      }, totalPoints);
    }
    
    return {
      date: sprintEnd.toISOString(),
      formattedDate: sprint.name,
      sprintName: sprint.name,
      ideal: Math.round(idealRemaining * 10) / 10,
      actual: isBefore(sprintEnd, today) || isSameDay(sprintEnd, today) 
        ? Math.round(actualRemaining * 10) / 10 
        : null, // Don't show actual data for future sprints
      remaining: isBefore(sprintEnd, today) || isSameDay(sprintEnd, today) 
        ? Math.round(actualRemaining * 10) / 10 
        : null // Don't show remaining data for future sprints
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
