
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
  TouchSensor,
  KeyboardSensor
} from "@dnd-kit/core";
import {
  SortableContext, 
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  columnId: string;
  columnIndex: number;
}

interface KanbanBoardProps {
  sprintId: string;
}

// Sortable Task Wrapper
const SortableTaskCard = ({ task, onEdit, onDelete }: { task: Task; onEdit: (task: Task) => void; onDelete: (taskId: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: task.id,
    data: {
      type: 'task',
      task
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    width: '100%',
    position: isDragging ? 'relative' : 'static',
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className="w-full touch-none mb-3" {...attributes} {...listeners}>
      <div className="cursor-grab active:cursor-grabbing">
        <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} isDraggable={true} />
      </div>
    </div>
  );
};

// Kanban Column with Droppable Support
const KanbanColumn = ({ title, tasks, onEdit, onDelete, columnId, columnIndex }: KanbanColumnProps) => {
  // Sort tasks by priority (high -> medium -> low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedTasks = [...tasks].sort((a, b) => {
    return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
  });
  
  return (
    <Card 
      className="flex-1 min-w-[280px] max-w-[350px] bg-secondary/30 h-fit" 
      id={columnId} 
      data-column-id={columnId}
      data-droppable-column="true"
    >
      <CardHeader className="bg-muted/30 pb-2">
        <CardTitle className="text-md font-medium">{title} ({tasks.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-2 min-h-[100px]">
        <ScrollArea className="h-[calc(100vh-300px)] pr-2">
          <SortableContext items={sortedTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            <div className="w-full space-y-0 pb-3">
              {sortedTasks.map(task => (
                <SortableTaskCard 
                  key={task.id} 
                  task={task} 
                  onEdit={onEdit} 
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
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
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);

  // Configure sensors with better touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 }, // Lower threshold for easier drag initiation
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 }, // Lower delay for better touch responsiveness
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
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
    console.log("KanbanBoard: Drag started:", event);
    const taskId = event.active.id as string;
    const foundTask = tasks.find(t => t.id === taskId);
    setActiveId(taskId);
    if (foundTask) setActiveTask(foundTask);
    
    // Add a class to the body to indicate dragging is happening
    document.body.classList.add('is-dragging-task');
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    // If no over element, clear the highlighted column
    if (!over) {
      setHoveredColumnId(null);
      return;
    }
    
    const activeId = active.id.toString();
    const overId = over.id.toString();
    
    // Check if we're hovering over a column
    const isColumnHover = over.data.current?.droppableColumn || overId.startsWith('column-');
    
    // Find the column containing the over element if it's a task
    const columnElements = document.querySelectorAll('[data-droppable-column="true"]');
    
    // Clear previous highlight
    columnElements.forEach(el => {
      el.classList.remove('ring-2', 'ring-primary', 'ring-opacity-70');
    });
    
    // If hovering directly over a column
    if (isColumnHover) {
      // Highlight the column we're over
      const columnId = overId;
      setHoveredColumnId(columnId);
      
      const columnElement = document.getElementById(columnId);
      if (columnElement) {
        columnElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-70');
      }
    } else {
      // If hovering over a task, find which column contains this task
      const taskElement = document.getElementById(overId) || document.querySelector(`[data-id="${overId}"]`);
      if (taskElement) {
        // Find the parent column
        const columnElement = taskElement.closest('[data-droppable-column="true"]');
        if (columnElement) {
          const columnId = columnElement.id;
          setHoveredColumnId(columnId);
          columnElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-70');
        } else {
          setHoveredColumnId(null);
        }
      } else {
        setHoveredColumnId(null);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log("KanbanBoard: Drag ended:", event);
    const { active, over } = event;
    
    setActiveTask(null);
    setActiveId(null);
    setHoveredColumnId(null);
    
    // Remove dragging class and column highlights
    document.body.classList.remove('is-dragging-task');
    document.querySelectorAll('[data-droppable-column="true"]').forEach(el => {
      el.classList.remove('ring-2', 'ring-primary', 'ring-opacity-70');
    });

    if (!over || !active) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task || !user) return;

    // Handle dropping on a column
    const overId = over.id.toString();
    const activeId = active.id.toString();
    
    // First check if we're dropping on another task
    if (overId !== activeId) {
      const isOverATask = !overId.startsWith("column-");
      
      if (isOverATask) {
        // Get the task we're dropping onto
        const overTask = tasks.find(t => t.id === overId);
        if (overTask) {
          // We're dropping onto another task in the same column - just reorder
          if (task.status === overTask.status) {
            const oldIndex = tasks.findIndex(t => t.id === taskId);
            const newIndex = tasks.findIndex(t => t.id === overId);
            
            if (oldIndex !== -1 && newIndex !== -1) {
              // This just updates the UI, not the database order
              setTasks(prevTasks => arrayMove(prevTasks, oldIndex, newIndex));
            }
            return;
          } else {
            // We're dropping onto a task in another column - move to that column
            const newStatus = overTask.status;
            await moveTaskToNewStatus(task, newStatus);
          }
        }
      } else {
        // We're dropping directly onto a column - identify the column from the id
        const newStatusMap: Record<string, Task["status"]> = {
          "column-todo": "todo",
          "column-in-progress": "in-progress",
          "column-in-review": "in-review",
          "column-done": "done",
        };
        
        const newStatus = newStatusMap[overId];
        if (!newStatus || newStatus === task.status) return;
        
        await moveTaskToNewStatus(task, newStatus);
      }
    }
  };
  
  const moveTaskToNewStatus = async (task: Task, newStatus: Task["status"]) => {
    if (!user || newStatus === task.status) return;
    
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
        prevTasks.map(t => (t.id === task.id ? { ...t, status: newStatus, completedAt } : t))
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
        prevTasks.map(t => (t.id === task.id ? { ...task } : t))
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
          <KanbanColumn 
            title="To Do" 
            tasks={tasks.filter(t => t.status === "todo")} 
            onEdit={handleEditTask} 
            onDelete={handleDeleteTask} 
            columnId="column-todo"
            columnIndex={0} 
          />
          <KanbanColumn 
            title="In Progress" 
            tasks={tasks.filter(t => t.status === "in-progress")} 
            onEdit={handleEditTask} 
            onDelete={handleDeleteTask} 
            columnId="column-in-progress"
            columnIndex={1} 
          />
          <KanbanColumn 
            title="In Review" 
            tasks={tasks.filter(t => t.status === "in-review")} 
            onEdit={handleEditTask} 
            onDelete={handleDeleteTask} 
            columnId="column-in-review" 
            columnIndex={2}
          />
          <KanbanColumn 
            title="Done" 
            tasks={tasks.filter(t => t.status === "done")} 
            onEdit={handleEditTask} 
            onDelete={handleDeleteTask} 
            columnId="column-done" 
            columnIndex={3}
          />
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="w-[300px] opacity-90 shadow-lg">
              <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} isDraggable={false} />
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
