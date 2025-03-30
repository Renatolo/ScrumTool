
import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSprintById } from "@/lib/supabase/sprints";
import { Sprint } from "@/types/sprint";
import { useToast } from "@/hooks/use-toast";
import KanbanBoard from "@/components/KanbanBoard";
import { 
  DndContext, 
  DragOverlay, 
  useSensors, 
  useSensor, 
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Task } from "@/types/task";
import { updateTask } from "@/lib/supabase/tasks";
import TaskCard from "./TaskCard";

const SprintBoard = () => {
  const { sprintId } = useParams<{ sprintId: string }>();
  const { toast } = useToast();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const kanbanBoardRef = useRef<any>(null);
  const [currentDragOverColumn, setCurrentDragOverColumn] = useState<string | null>(null);

  // Configure sensors with better activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 }, // Lower threshold for easier drag activation
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 }, // Lower delay for touch
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadSprint = async () => {
      if (!sprintId) return;

      try {
        setLoading(true);
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    console.log("Drag started:", active);
    
    if (active.data?.current?.task) {
      setActiveTask(active.data.current.task);
    }
    // Add a class to the body to indicate dragging is happening
    document.body.classList.add('is-dragging-task');
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    console.log("Drag over:", over?.id);
    
    if (over && over.id.toString().startsWith('column-')) {
      setCurrentDragOverColumn(over.id.toString());
      
      // Highlight the column when hovering
      const columnElements = document.querySelectorAll('[data-column-id]');
      columnElements.forEach(el => {
        if (el.getAttribute('data-column-id') === over.id.toString()) {
          el.classList.add('ring-2', 'ring-primary', 'ring-opacity-70');
        } else {
          el.classList.remove('ring-2', 'ring-primary', 'ring-opacity-70');
        }
      });
    } else {
      setCurrentDragOverColumn(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log("Drag ended:", event);
    setActiveTask(null);
    const { active, over } = event;
    setCurrentDragOverColumn(null);
    
    // Remove any column highlighting
    document.querySelectorAll('[data-column-id]').forEach(el => {
      el.classList.remove('ring-2', 'ring-primary', 'ring-opacity-70');
    });
    
    document.body.classList.remove('is-dragging-task');
    
    if (!active || !over || !user) return;
    
    // Check if dropping on a column
    if (active.data?.current?.type === 'task' && over.id.toString().startsWith('column-')) {
      const task = active.data.current.task as Task;
      const columnId = over.id.toString();
      
      // Determine the status based on the column
      const statusMap: Record<string, Task["status"]> = {
        "column-todo": "todo",
        "column-in-progress": "in-progress",
        "column-in-review": "in-review",
        "column-done": "done",
      };
      
      const newStatus = statusMap[columnId];
      
      if (!newStatus || newStatus === task.status) return;
      
      try {
        // Set completedAt based on the new status
        let completedAt = task.completedAt;
        if (newStatus === 'done' && !completedAt) {
          completedAt = new Date().toISOString();
        } else if (newStatus !== 'done' && completedAt) {
          completedAt = undefined;
        }
        
        // Update the task with the new status
        const updatedTask = {
          ...task,
          status: newStatus,
          completedAt,
          user_id: user.id
        };
        
        await updateTask(updatedTask);
        
        toast({
          title: "Task moved",
          description: `Task moved to ${newStatus.replace("-", " ")}`,
        });
        
        // Refresh the kanban board
        if (sprintId && kanbanBoardRef.current?.refreshBoard) {
          kanbanBoardRef.current.refreshBoard();
        }
      } catch (error) {
        console.error("Error updating task:", error);
        toast({
          title: "Error",
          description: "Failed to move task",
          variant: "destructive",
        });
      }
    }
    
    // Check if this is a product backlog task
    else if (active.data?.current?.type === 'product-backlog-task' && over.id.toString().startsWith('column-')) {
      const task = active.data.current.task as Task;
      const columnId = over.id.toString();
      
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
        if (sprintId && kanbanBoardRef.current?.refreshBoard) {
          kanbanBoardRef.current.refreshBoard();
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

  const handleDragCancel = () => {
    setActiveTask(null);
    setCurrentDragOverColumn(null);
    // Remove dragging class
    document.body.classList.remove('is-dragging-task');
    // Remove any column highlighting
    document.querySelectorAll('[data-column-id]').forEach(el => {
      el.classList.remove('ring-2', 'ring-primary', 'ring-opacity-70');
    });
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
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="container mx-auto p-4 max-w-full">
        <div className="overflow-x-auto pb-6">
          {sprintId && <KanbanBoard sprintId={sprintId} ref={kanbanBoardRef} />}
        </div>
        
        <DragOverlay>
          {activeTask && (
            <div className="p-1 bg-white border rounded-md shadow-lg w-[300px] opacity-90">
              <TaskCard 
                task={activeTask} 
                onEdit={() => {}} 
                onDelete={() => {}} 
                isDraggable={false}
              />
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default SprintBoard;
