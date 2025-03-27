
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSprintById } from "@/lib/supabase/sprints";
import { useToast } from "@/hooks/use-toast";
import KanbanBoard from "@/components/KanbanBoard";
import { ArrowLeft, CalendarClock, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Sprint } from "@/types/sprint";
import { Badge } from "@/components/ui/badge";

const SprintPage = () => {
  const { sprintId } = useParams<{ sprintId: string }>();
  const { toast } = useToast();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const loadSprint = async () => {
      if (!sprintId) return;

      try {
        setLoading(true);
        // Fetch the specific sprint by ID
        const foundSprint = await fetchSprintById(sprintId);
        
        if (foundSprint) {
          setSprint(foundSprint);
          
          // Calculate days remaining
          const today = new Date();
          const endDate = new Date(foundSprint.endDate);
          const days = differenceInDays(endDate, today);
          setDaysRemaining(days);
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

  // Helper function to get the appropriate badge color
  const getDaysRemainingBadgeColor = (days: number) => {
    if (days < 0) return "destructive";
    if (days <= 2) return "destructive";
    if (days <= 5) return "warning";
    return "success";
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
        <div className="flex items-center gap-4">
          <div className="text-sm flex items-center gap-2">
            <CalendarClock size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">
              {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}
            </span>
          </div>
          
          {daysRemaining !== null && (
            <Badge variant={getDaysRemainingBadgeColor(daysRemaining)} className="flex items-center gap-1 px-2 py-1">
              {daysRemaining < 0 ? (
                <>
                  <AlertCircle size={14} />
                  <span>Sprint ended {Math.abs(daysRemaining)} day{Math.abs(daysRemaining) !== 1 ? 's' : ''} ago</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} />
                  <span>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</span>
                </>
              )}
            </Badge>
          )}
          
          <Button variant="outline" onClick={handleGoHome}>Home</Button>
        </div>
      </div>

      {sprintId && <KanbanBoard sprintId={sprintId} />}
    </div>
  );
};

export default SprintPage;
