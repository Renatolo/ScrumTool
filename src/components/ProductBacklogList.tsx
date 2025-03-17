import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types/task";
import { Sprint } from "@/types/sprint";
import { fetchProductBacklog, deleteTask, updateTask } from "@/lib/supabase/tasks";
import { fetchProjectSprints } from "@/lib/supabase/sprints";
import TaskCard from "@/components/TaskCard";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import EditTaskDialog from "@/components/EditTaskDialog";
import MoveTaskDialog from "@/components/MoveTaskDialog";

interface ProductBacklogListProps {
  projectId: string;
}

const ProductBacklogList = ({ projectId }: ProductBacklogListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const backlogTasks = await fetchProductBacklog(projectId);
      setTasks(backlogTasks);
    } catch (error) {
      console.error("Failed to fetch product backlog:", error);
      toast({
        title: "Error",
        description: "Failed to load product backlog",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSprints = async () => {
    if (!projectId) return;
    try {
      const projectSprints = await fetchProjectSprints(projectId);
      setSprints(projectSprints);
    } catch (error) {
      console.error("Failed to fetch sprints:", error);
      toast({
        title: "Error",
        description: "Failed to load sprints",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTasks();
      fetchAvailableSprints();
    }
  }, [projectId]);

  const handleCreateTask = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleMoveTask = (task: Task) => {
    setSelectedTask(task);
    setIsMoveDialogOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const onTaskCreated = (task: Task) => {
    setTasks([...tasks, task]);
    setIsCreateDialogOpen(false);
  };

  const onTaskUpdated = (updatedTask: Task) => {
    setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
    setIsEditDialogOpen(false);
    setSelectedTask(null);
  };

  const onTaskMoved = async (taskId: string, sprintId: string) => {
    try {
      const taskToMove = tasks.find(task => task.id === taskId);
      if (!taskToMove || !user) return;

      const updatedTask = {
        ...taskToMove,
        sprintId,
        user_id: user.id
      };

      await updateTask(updatedTask);
      
      fetchTasks();
      
      toast({
        title: "Task moved",
        description: "Task has been moved to sprint successfully",
      });
      
      setIsMoveDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error("Failed to move task:", error);
      toast({
        title: "Error",
        description: "Failed to move task to sprint",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Product Backlog</h2>
        <Button onClick={handleCreateTask} size="sm">
          <Plus size={16} className="mr-1" /> Add Task
        </Button>
      </div>
      
      <ScrollArea className="flex-1 pr-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No tasks in the product backlog. Create your first task!
          </div>
        ) : (
          <div>
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => handleEditTask(task)}
                onDelete={handleDeleteTask}
                onMove={() => handleMoveTask(task)}
                showMoveButton={sprints.length > 0}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {user && (
        <>
          <CreateTaskDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            userId={user.id}
            projectId={projectId}
            onTaskCreated={onTaskCreated}
          />
          
          {selectedTask && (
            <>
              <EditTaskDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                task={selectedTask}
                userId={user.id}
                onTaskUpdated={onTaskUpdated}
              />
              
              <MoveTaskDialog
                open={isMoveDialogOpen}
                onOpenChange={setIsMoveDialogOpen}
                task={selectedTask}
                sprints={sprints}
                onTaskMoved={onTaskMoved}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ProductBacklogList;
