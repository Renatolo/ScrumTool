
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types/task";
import { Sprint } from "@/types/sprint";
import { fetchProductBacklog, updateTask, deleteTask } from "@/lib/supabase/tasks";
import { fetchProjectSprints } from "@/lib/supabase/sprints";
import { Plus, ListChecks, Edit, ArrowRight, Trash, Grab } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CreateTaskDialog from "./CreateTaskDialog";
import EditTaskDialog from "./EditTaskDialog";
import MoveTaskDialog from "./MoveTaskDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDraggable } from "@dnd-kit/core";

interface ProductBacklogProps {
  projectId: string;
  onRefresh?: () => void;
  activeSprint?: Sprint | null;
}

const DraggableTaskItem = ({ task, onEdit, onMove, onDelete, getPriorityColor }: { 
  task: Task, 
  onEdit: (task: Task) => void, 
  onMove: (task: Task) => void, 
  onDelete: (taskId: string) => void,
  getPriorityColor: (priority: string) => string
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `product-backlog-task-${task.id}`,
    data: {
      type: 'product-backlog-task',
      task
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? 'relative' : undefined,
  } as React.CSSProperties : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      className="p-3 border rounded-md transition-colors mb-2 cursor-grab active:cursor-grabbing"
    >
      <div className="flex justify-between items-start mb-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h4 className="font-medium truncate max-w-[50ch]" {...listeners}>{task.title}</h4>
            </TooltipTrigger>
            <TooltipContent>
              <p>{task.title}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className={`text-xs font-medium px-2 py-1 rounded-full bg-muted ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </div>
      </div>
      {task.description && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{task.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{task.points} {task.points === 1 ? 'point' : 'points'}</span>
        <div className="flex space-x-1">
          <Button onClick={() => onEdit(task)} size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
          <Button onClick={() => onMove(task)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-500">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => onDelete(task.id)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500">
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const ProductBacklog = ({ projectId, onRefresh, activeSprint }: ProductBacklogProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [showMoveTaskDialog, setShowMoveTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadBacklog = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const backlogTasks = await fetchProductBacklog(projectId);
      const projectTasks = backlogTasks.filter(task => task.projectId === projectId);
      setTasks(projectTasks);
      
      const projectSprints = await fetchProjectSprints(projectId);
      setSprints(projectSprints);
    } catch (error) {
      console.error('Error loading product backlog:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product backlog',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBacklog();
  }, [projectId, user]);

  const handleCreateTask = async (task: Task) => {
    if (!user) return;
    
    try {
      const savedTask = await import('@/lib/supabase/tasks').then(
        module => module.createTask({
          ...task,
          user_id: user.id,
        })
      );
      
      setTasks(prev => [...prev, savedTask]);
      setShowCreateTaskDialog(false);
      
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowEditTaskDialog(true);
  };

  const handleMoveTask = (task: Task) => {
    setSelectedTask(task);
    setShowMoveTaskDialog(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    
    try {
      await deleteTask(taskId);
      
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task));
    setShowEditTaskDialog(false);
    setSelectedTask(null);
    
    toast({
      title: 'Success',
      description: 'Task updated successfully',
    });
  };

  const handleTaskMoved = async (taskId: string, sprintId: string) => {
    try {
      if (!user) return;
      
      const taskToMove = tasks.find(task => task.id === taskId);
      if (!taskToMove) return;
      
      const updatedTask = {
        ...taskToMove,
        sprintId,
        user_id: user.id
      };
      
      await updateTask(updatedTask);
      
      // Don't remove the task from the product backlog anymore
      // Just reload the backlog to update with the latest data
      loadBacklog();
      
      toast({
        title: 'Success',
        description: 'Task moved to sprint successfully',
      });
      
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error moving task:', error);
      toast({
        title: 'Error',
        description: 'Failed to move task to sprint',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-amber-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-blue-500';
    }
  };

  // Sort tasks by priority (high -> medium -> low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedTasks = [...tasks].sort((a, b) => {
    return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center">
            <ListChecks className="mr-2 h-5 w-5" />
            Product Backlog
          </CardTitle>
          <CardDescription>Tasks that need to be scheduled into sprints</CardDescription>
        </div>
        <Button onClick={() => setShowCreateTaskDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="text-center py-8">
            <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No tasks in backlog</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by creating your first task
            </p>
            <Button onClick={() => setShowCreateTaskDialog(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-1">
              {sortedTasks.map((task) => (
                <DraggableTaskItem
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onMove={handleMoveTask}
                  onDelete={handleDeleteTask}
                  getPriorityColor={getPriorityColor}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {showCreateTaskDialog && (
        <CreateTaskDialog
          open={showCreateTaskDialog}
          onOpenChange={setShowCreateTaskDialog}
          userId={user?.id || ""}
          projectId={projectId}
          onTaskCreated={handleCreateTask}
        />
      )}

      {selectedTask && showEditTaskDialog && (
        <EditTaskDialog
          task={selectedTask}
          open={showEditTaskDialog}
          onOpenChange={setShowEditTaskDialog}
          userId={user?.id || ""}
          onTaskUpdated={handleTaskUpdated}
        />
      )}

      {selectedTask && showMoveTaskDialog && (
        <MoveTaskDialog
          task={selectedTask}
          open={showMoveTaskDialog}
          onOpenChange={setShowMoveTaskDialog}
          sprints={sprints}
          onTaskMoved={handleTaskMoved}
        />
      )}
    </Card>
  );
};

export default ProductBacklog;
