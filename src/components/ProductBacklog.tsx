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
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductBacklogProps {
  projectId: string;
  onRefresh?: () => void;
}

const ProductBacklog = ({ projectId, onRefresh }: ProductBacklogProps) => {
  // ... keep existing code (state hooks and other variables)

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

  // ... keep existing code (useEffect and task creation handlers)

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

  // ... keep existing code (rest of the component)

  return (
    // ... keep existing code (component rendering)
  );
};

export default ProductBacklog;
