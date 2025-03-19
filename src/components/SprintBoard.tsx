
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSprints } from "@/lib/supabase/sprints";
import { Sprint } from "@/types/sprint";
import { useToast } from "@/hooks/use-toast";
import KanbanBoard from "@/components/KanbanBoard";
import { CalendarClock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import { Task } from "@/types/task";
import { updateTask } from "@/lib/supabase/tasks";
import TaskCard from "@/components/TaskCard";

const SprintBoard = () => {
  const { sprintId } = useParams<{ sprintId: string }>();
  const { toast } = useToast();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    const loadSprint = async () => {
      if (!sprintId) return;

      try {
        setLoading(true);
        // Fetch all sprints and find the one matching the ID
        const sprints = await fetchSprints(user?.id || "");
        const foundSprint = sprints.find(s => s.id === sprintId);
        
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
  }, [sprintId, user]);

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

  const handleDragEnd = async (event: any) => {
    setActiveTask(null);
    const { active, over } = event;
    
    if (!active || !over || !user) return;
    
    // Check if this is a product backlog task
    if (active.data?.current?.type === 'product-backlog-task' && over.id.startsWith('column-')) {
      const task = active.data.current.task;
      const columnId = over.id;
      
      // Determine the status based on the column
      const statusMap: Record<string, Task["status"]> = {
        "column-todo": "todo",
        "column-in-progress": "in-progress",
        "column-in-review": "in-review",
        "column-done": "done",
      };
      
      const newStatus = statusMap[columnId];
      
      if (!newStatus) return;
      
      try {
        // Update the task with the new sprint ID and status
        const updatedTask = {
          ...task,
          sprintId: sprintId,
          status: newStatus,
          user_id: user.id
        };
        
        await updateTask(updatedTask);
        
        toast({
          title: "Task moved",
          description: `Task moved to sprint and set to ${newStatus.replace("-", " ")}`,
        });
        
        // Refresh the kanban board to show the new task
        if (sprintId) {
          const kanbanBoardInstance = document.getElementById("kanban-board") as any;
          if (kanbanBoardInstance && kanbanBoardInstance.refreshBoard) {
            kanbanBoardInstance.refreshBoard();
          }
        }
      } catch (error) {
        console.error("Error updating task:", error);
        toast({
          title: "Error",
          description: "Failed to move task to sprint",
          variant: "destructive",
        });
      }
    }
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    if (active.data?.current?.type === 'product-backlog-task') {
      setActiveTask(active.data.current.task);
    }
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
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <div className="container mx-auto p-4">
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
        
        <DragOverlay>
          {activeTask && (
            <div className="p-4 bg-white border rounded-md shadow-lg">
              <h4 className="font-medium">{activeTask.title}</h4>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default SprintBoard;
