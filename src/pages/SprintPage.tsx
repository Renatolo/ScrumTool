import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSprintById } from "@/lib/supabase/sprints";
import { useToast } from "@/hooks/use-toast";
import KanbanBoard from "@/components/KanbanBoard";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sprint } from "@/types/sprint";

const SprintPage = () => {
  const { sprintId } = useParams<{ sprintId: string }>();
  const { toast } = useToast();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadSprint = async () => {
      if (!sprintId) return;

      try {
        setLoading(true);
        // Fetch the specific sprint by ID
        const foundSprint = await fetchSprintById(sprintId);
        
        if (foundSprint) {
          setSprint(foundSprint);
        } else {
          toast({
            title: "Error",
            description: "Sprint not found",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to fetch sprint:", error);
        toast({
          title: "Error",
          description: "Failed to load sprint data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSprint();
  }, [sprintId, toast]);

  const calculateProgress = () => {
    if (!sprint) return 0;
    
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const today = new Date();
    
    if (today < startDate) return 0;
    if (today > endDate) return 100;
    
    const totalDays = differenceInDays(endDate, startDate) || 1;
    const daysElapsed = differenceInDays(today, startDate);
    
    return Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  };

  const handleBackToProject = () => {
    if (sprint && sprint.projectId) {
      navigate(`/project/${sprint.projectId}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500">Sprint not found</h2>
          <p className="text-muted-foreground">This sprint may have been deleted or doesn't exist.</p>
          <Button onClick={handleGoHome} className="mt-4">Return to Home</Button>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleBackToProject}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Sprint Board</h1>
        </div>
        <Button variant="outline" onClick={handleGoHome}>Home</Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">{sprint.name}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <CalendarClock size={16} className="mr-1" />
              {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2">
            <div className="flex justify-between mb-1 text-sm">
              <span>Sprint Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardContent>
      </Card>

      {sprintId && <KanbanBoard sprintId={sprintId} />}
    </div>
  );
};

export default SprintPage;
