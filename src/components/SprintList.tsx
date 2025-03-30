
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sprint } from "@/types/sprint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { CalendarIcon, ArrowRight, CalendarDays } from "lucide-react";
import { format, isAfter, isBefore, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface SprintListProps {
  sprints: Sprint[];
  activeSprint: Sprint | null;
  onCreateSprint: () => void;
  loading: boolean;
}

interface SprintsByCategory {
  past: Sprint[];
  current: Sprint[];
  future: Sprint[];
}

const SprintList = ({ sprints, activeSprint, onCreateSprint, loading }: SprintListProps) => {
  const navigate = useNavigate();
  const [sprintsByCategory, setSprintsByCategory] = useState<SprintsByCategory>({
    past: [],
    current: [],
    future: []
  });

  useEffect(() => {
    if (sprints.length === 0) return;

    const today = new Date();
    
    const categorizedSprints = sprints.reduce<SprintsByCategory>(
      (acc, sprint) => {
        const startDate = new Date(sprint.startDate);
        const endDate = new Date(sprint.endDate);
        
        if (isBefore(endDate, today) && !isToday(endDate)) {
          // Past sprints
          acc.past.push(sprint);
        } else if (isAfter(startDate, today) && !isToday(startDate)) {
          // Future sprints
          acc.future.push(sprint);
        } else {
          // Current sprints (including today)
          acc.current.push(sprint);
        }
        
        return acc;
      },
      { past: [], current: [], future: [] }
    );
    
    // Sort past sprints from newest to oldest
    categorizedSprints.past.sort((a, b) => 
      new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    );
    
    // Sort future sprints from soonest to furthest
    categorizedSprints.future.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    
    setSprintsByCategory(categorizedSprints);
  }, [sprints]);

  const navigateToSprint = (sprintId: string) => {
    navigate(`/sprint/${sprintId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (sprints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20">
        <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">No Sprints Created</h3>
        <p className="text-center text-muted-foreground mb-6">
          Create your first sprint to start organizing your project tasks.
        </p>
        <Button onClick={onCreateSprint}>Create Sprint</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Past Sprints Column */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-muted-foreground ml-2">Past Sprints</h3>
          
          {sprintsByCategory.past.length === 0 ? (
            <Card className="bg-muted/10 border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No past sprints
                </p>
              </CardContent>
            </Card>
          ) : (
            sprintsByCategory.past.map((sprint) => (
              <Card 
                key={sprint.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigateToSprint(sprint.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex justify-between items-center">
                    <span className="truncate">{sprint.name}</span>
                    <Badge variant="secondary" className="text-xs">Completed</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>
                      {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-3">
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={(e) => {
                    e.stopPropagation();
                    navigateToSprint(sprint.id);
                  }}>
                    View Sprint <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
        
        {/* Current Sprint Column */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-primary ml-2">Current Sprint</h3>
          
          {sprintsByCategory.current.length === 0 ? (
            <Card className="bg-muted/10 border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No active sprint
                </p>
              </CardContent>
            </Card>
          ) : (
            sprintsByCategory.current.map((sprint) => (
              <Card 
                key={sprint.id} 
                className={cn(
                  "hover:shadow-md transition-shadow cursor-pointer",
                  activeSprint && activeSprint.id === sprint.id ? 
                  "border-2 border-primary shadow-md" : ""
                )}
                onClick={() => navigateToSprint(sprint.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex justify-between items-center">
                    <span className="truncate">{sprint.name}</span>
                    {activeSprint && activeSprint.id === sprint.id ? (
                      <Badge className="bg-primary text-primary-foreground hover:bg-primary">Active</Badge>
                    ) : (
                      <Badge variant="outline">In Progress</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>
                      {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-3">
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={(e) => {
                    e.stopPropagation();
                    navigateToSprint(sprint.id);
                  }}>
                    View Sprint <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
        
        {/* Future Sprints Column */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-muted-foreground ml-2">Future Sprints</h3>
          
          {sprintsByCategory.future.length === 0 ? (
            <Card className="bg-muted/10 border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No future sprints planned
                </p>
              </CardContent>
            </Card>
          ) : (
            sprintsByCategory.future.map((sprint) => (
              <Card 
                key={sprint.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigateToSprint(sprint.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex justify-between items-center">
                    <span className="truncate">{sprint.name}</span>
                    <Badge variant="outline">Upcoming</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>
                      {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-3">
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={(e) => {
                    e.stopPropagation();
                    navigateToSprint(sprint.id);
                  }}>
                    View Sprint <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SprintList;
