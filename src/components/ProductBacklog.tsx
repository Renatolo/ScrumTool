
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types/task";
import { Sprint } from "@/types/sprint";
import { fetchProductBacklog, updateTask, deleteTask } from "@/lib/supabase/tasks";
import { fetchProjectSprints } from "@/lib/supabase/sprints";
import { Plus, ListChecks, Edit, ArrowRight, Trash } from "lucide-react";
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

interface ProductBacklogProps {
  projectId: string;
  onRefresh?: () => void;
}

const ProductBacklog = ({ projectId, onRefresh }: ProductBacklogProps) => {
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
      // Filter for tasks associated with current project
      const projectTasks = backlogTasks.filter(task => task.projectId === projectId);
      setTasks(projectTasks);
      
      // Load sprints for the project
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
      // Save task to Supabase
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
      
      // Remove the task from the state
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
      
      // Remove the task from the backlog state
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
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

  return (
    <Card>
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
          Add Task
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mb-2 mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading backlog...</p>
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className="p-3 border rounded-md hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h4 className="font-medium truncate max-w-[50ch]">{task.title}</h4>
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
                    <Button onClick={() => handleEditTask(task)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {sprints.length > 0 && (
                      <Button onClick={() => handleMoveTask(task)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-500">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                    <Button onClick={() => handleDeleteTask(task.id)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ListChecks className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
            <h3 className="text-lg font-medium mb-2">No tasks in backlog</h3>
            <p className="text-muted-foreground mb-4">Add tasks to your product backlog to start planning your sprints</p>
            <Button onClick={() => setShowCreateTaskDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Task
            </Button>
          </div>
        )}
      </CardContent>

      {/* Create Task Dialog */}
      {user && (
        <>
          <CreateTaskDialog
            open={showCreateTaskDialog}
            onOpenChange={setShowCreateTaskDialog}
            onTaskCreated={handleCreateTask}
            projectId={projectId}
            userId={user.id}
          />
          
          {selectedTask && (
            <>
              <EditTaskDialog
                open={showEditTaskDialog}
                onOpenChange={setShowEditTaskDialog}
                task={selectedTask}
                userId={user.id}
                onTaskUpdated={handleTaskUpdated}
              />
              
              <MoveTaskDialog
                open={showMoveTaskDialog}
                onOpenChange={setShowMoveTaskDialog}
                task={selectedTask}
                sprints={sprints}
                onTaskMoved={handleTaskMoved}
              />
            </>
          )}
        </>
      )}
    </Card>
  );
};

export default ProductBacklog;
