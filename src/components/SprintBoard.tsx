import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSprints } from "@/lib/supabase/sprints";
import { Sprint } from "@/types/sprint";
import { useToast } from "@/hooks/use-toast";
import KanbanBoard from "@/components/KanbanBoard";
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import { Task } from "@/types/task";
import { updateTask } from "@/lib/supabase/tasks";

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
  }, [sprintId, user, toast]);

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

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <div className="container mx-auto p-4 max-w-full">
        <div className="overflow-x-auto pb-6">
          {sprintId && <KanbanBoard sprintId={sprintId} />}
        </div>
        
        <DragOverlay>
          {activeTask && (
            <div className="p-3 bg-white border rounded-md shadow-lg max-w-[220px]">
              <h4 className="font-medium text-sm">{activeTask.title}</h4>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default SprintBoard;
