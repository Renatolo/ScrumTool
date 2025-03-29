
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Task } from "@/types/task";
import { fetchSprintTasks, updateTask, deleteTask } from "@/lib/supabase/tasks";
import TaskCard from "@/components/TaskCard";
import { useToast } from "@/hooks/use-toast";
import EditTaskDialog from "@/components/EditTaskDialog";
import { 
  DndContext, 
  DragEndEvent, 
  closestCenter, 
  DragStartEvent, 
  DragOverEvent,
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor,
  useDroppable 
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  columnId: string;
}

interface KanbanBoardProps {
  sprintId: string;
}

// Sortable Task Wrapper
const SortableTaskCard = ({ task, onEdit, onDelete }: { task: Task; onEdit: (task: Task) => void; onDelete: (taskId: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: '100%',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="w-full">
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} isDraggable={true} />
    </div>
  );
};

// Kanban Column with Droppable Support
const KanbanColumn = ({ title, tasks, onEdit, onDelete, columnId }: KanbanColumnProps) => {
  const { setNodeRef } = useDroppable({ id: columnId });

  return (
    <Card ref={setNodeRef} className="flex-1 min-w-[280px] max-w-[350px] bg-secondary/30 h-fit" id={columnId}>
      <CardHeader className="bg-muted/30 pb-2">
        <CardTitle className="text-md font-medium">{title} ({tasks.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[calc(100vh-300px)] pr-2">
          <div className="w-full space-y-3 pb-3">
            {tasks.map(task => (
              <SortableContext key={task.id} items={[task.id]} strategy={verticalListSortingStrategy}>
                <SortableTaskCard task={task} onEdit={onEdit} onDelete={onDelete} />
              </SortableContext>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Main Kanban Board Component
const KanbanBoard = forwardRef(({ sprintId }: KanbanBoardProps, ref) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentOverId, setCurrentOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // Slightly increased for better response
    })
  );

  useImperativeHandle(ref, () => ({
    refreshBoard: fetchTasks
  }));

  useEffect(() => {
    if (sprintId) {
      fetchTasks();
    }
  }, [sprintId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const sprintTasks = await fetchSprintTasks(sprintId);
      setTasks(sprintTasks);
    } catch (error) {
      console.error("Failed to fetch sprint tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load sprint tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
      toast({ title: "Task deleted", description: "Task has been deleted successfully" });
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const foundTask = tasks.find(t => t.id === taskId);
    setActiveId(taskId);
    if (foundTask) setActiveTask(foundTask);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    // Update current column being dragged over for visual feedback if needed
    if (over) {
      setCurrentOverId(over.id as string);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveId(null);
    setCurrentOverId(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task || !user) return;

    const newStatusMap: Record<string, Task["status"]> = {
      "column-todo": "todo",
      "column-in-progress": "in-progress",
      "column-in-review": "in-review",
      "column-done": "done",
    };

    const columnId = over.id as string;
    const newStatus = newStatusMap[columnId];
    
    if (!newStatus || newStatus === task.status) return;

    console.log(`Moving task ${taskId} from ${task.status} to ${newStatus}`);

    try {
      // Set completedAt based on the new status
      let completedAt = task.completedAt;
      if (newStatus === 'done' && !completedAt) {
        completedAt = new Date().toISOString();
      } else if (newStatus !== 'done' && completedAt) {
        completedAt = undefined;
      }
      
      // Optimistically update UI first
      setTasks(prevTasks =>
        prevTasks.map(t => (t.id === taskId ? { ...t, status: newStatus, completedAt } : t))
      );
      
      // Then update the database
      const updatedTask: Task & { user_id: string } = { 
        ...task, 
        status: newStatus, 
        completedAt,
        user_id: user.id 
      };
      
      await updateTask(updatedTask);
      
      toast({ 
        title: "Task updated", 
        description: `Task moved to ${newStatus.replace("-", " ")}` 
      });
    } catch (error) {
      console.error("Failed to update task status:", error);
      // Revert the optimistic update on failure
      setTasks(prevTasks =>
        prevTasks.map(t => (t.id === taskId ? { ...task } : t))
      );
      toast({ 
        title: "Error", 
        description: "Failed to update task status", 
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-full" id="kanban-board">
      <h2 className="text-xl font-semibold mb-4">Sprint Board</h2>

      <DndContext 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <div className="flex gap-4 overflow-x-auto pb-6 snap-x">
          <KanbanColumn title="To Do" tasks={tasks.filter(t => t.status === "todo")} onEdit={handleEditTask} onDelete={handleDeleteTask} columnId="column-todo" />
          <KanbanColumn title="In Progress" tasks={tasks.filter(t => t.status === "in-progress")} onEdit={handleEditTask} onDelete={handleDeleteTask} columnId="column-in-progress" />
          <KanbanColumn title="In Review" tasks={tasks.filter(t => t.status === "in-review")} onEdit={handleEditTask} onDelete={handleDeleteTask} columnId="column-in-review" />
          <KanbanColumn title="Done" tasks={tasks.filter(t => t.status === "done")} onEdit={handleEditTask} onDelete={handleDeleteTask} columnId="column-done" />
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="w-[300px]">
              <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} isDraggable />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          userId={user?.id || ""}
          onTaskUpdated={(updatedTask) => {
            setTasks(prevTasks =>
              prevTasks.map(task => (task.id === updatedTask.id ? updatedTask : task))
            );
            setIsEditDialogOpen(false);
          }}
        />
      )}
    </div>
  );
});

KanbanBoard.displayName = "KanbanBoard";

export default KanbanBoard;
