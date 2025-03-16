
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@/types/task";
import { Sprint } from "@/types/sprint";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { fetchProductBacklog, updateTask } from "@/lib/supabase/tasks";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface MoveTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  sprints: Sprint[];
  onTaskMoved: (taskId: string, sprintId: string) => void;
}

const MoveTaskDialog = ({ task, open, onOpenChange, sprints, onTaskMoved }: MoveTaskDialogProps) => {
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSprintId || !user) return;
    
    try {
      setIsMoving(true);
      
      // Update the task with the new sprint ID
      const updatedTask = {
        ...task,
        sprintId: selectedSprintId,
        user_id: user.id
      };
      
      await updateTask(updatedTask);
      
      // Notify parent component that task was moved
      onTaskMoved(task.id, selectedSprintId);
      
      // Close dialog after successful move
      onOpenChange(false);
      
      toast({
        title: "Success",
        description: "Task moved to sprint successfully",
      });
    } catch (error) {
      console.error("Failed to move task:", error);
      toast({
        title: "Error",
        description: "Failed to move task to sprint",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move Task to Sprint</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="font-medium">Task: {task.title}</h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
          
          <div className="space-y-4">
            <Label>Select Sprint</Label>
            <RadioGroup value={selectedSprintId} onValueChange={setSelectedSprintId}>
              {sprints.map((sprint) => (
                <div key={sprint.id} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent/50">
                  <RadioGroupItem value={sprint.id} id={sprint.id} />
                  <Label htmlFor={sprint.id} className="flex-1 flex items-center justify-between">
                    <span>{sprint.name}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar size={12} />
                      {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d")}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedSprintId || isMoving}>
              {isMoving ? "Moving..." : "Move Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MoveTaskDialog;
