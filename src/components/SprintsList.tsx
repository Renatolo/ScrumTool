
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprint } from "@/types/sprint";
import { fetchProjectSprints } from "@/lib/supabase/sprints";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, CalendarCheck2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface SprintsListProps {
  projectId: string;
  onCreateClick: () => void;
}

const SprintsList = ({ projectId, onCreateClick }: SprintsListProps) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Fetch sprints
  useEffect(() => {
    const loadSprints = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const allSprints = await fetchProjectSprints(projectId);
        setSprints(allSprints);
      } catch (error) {
        console.error("Error loading sprints:", error);
        toast({
          title: "Error",
          description: "Failed to load sprints",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadSprints();
  }, [projectId]);
  
  // Sort sprints into past, active, and future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const pastSprints = sprints.filter(sprint => {
    const endDate = new Date(sprint.endDate);
    return endDate < today;
  }).sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  
  const activeSprints = sprints.filter(sprint => {
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    return startDate <= today && endDate >= today;
  });
  
  const futureSprints = sprints.filter(sprint => {
    const startDate = new Date(sprint.startDate);
    return startDate > today;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  const renderSprints = (sprintsList: Sprint[], categoryClass: string, emptyMessage: string, icon: React.ReactNode) => (
    <div className={`rounded-lg p-4 ${categoryClass} min-h-[200px]`}>
      {sprintsList.length > 0 ? (
        <div className="space-y-3">
          {sprintsList.map((sprint) => (
            <Link to={`/sprint/${sprint.id}`} key={sprint.id}>
              <div className="bg-background/90 border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all">
                <h4 className="font-medium">{sprint.name}</h4>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  <span>
                    {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          {icon}
          <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>All Sprints</CardTitle>
          <Button onClick={onCreateClick}>Create Sprint</Button>
        </div>
        <CardDescription>View and manage all project sprints</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderSprints(
            pastSprints, 
            "bg-red-50/40", 
            "No past sprints", 
            <Clock className="h-8 w-8 text-red-300/60" />
          )}
          {renderSprints(
            activeSprints, 
            "bg-green-50/40", 
            "No active sprints", 
            <CalendarCheck2 className="h-8 w-8 text-green-300/60" />
          )}
          {renderSprints(
            futureSprints, 
            "bg-blue-50/40", 
            "No future sprints planned", 
            <CalendarDays className="h-8 w-8 text-blue-300/60" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SprintsList;
