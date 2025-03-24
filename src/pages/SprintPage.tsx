
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSprintById } from "@/lib/supabase/sprints";
import { useToast } from "@/hooks/use-toast";
import KanbanBoard from "@/components/KanbanBoard";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { format } from "date-fns";
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleBackToProject}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Sprint Board</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            <CalendarClock size={16} className="inline mr-1" />
            {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}
          </div>
          <Button variant="outline" onClick={handleGoHome}>Home</Button>
        </div>
      </div>

      {sprintId && <KanbanBoard sprintId={sprintId} />}
    </div>
  );
};

export default SprintPage;
