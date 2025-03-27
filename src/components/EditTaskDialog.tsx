
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task } from "@/types/task";
import { Profile } from "@/types/user";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check, UserIcon } from "lucide-react";
import { fetchProjectMembers } from "@/lib/supabase/tasks";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onTaskUpdated: (task: Task) => void;
}

const EditTaskDialog = ({ task, open, onOpenChange, userId, onTaskUpdated }: EditTaskDialogProps) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [points, setPoints] = useState(task.points.toString());
  const [status, setStatus] = useState(task.status);
  const [assignees, setAssignees] = useState(task.assignees || []);
  const [memberProfiles, setMemberProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setPoints(task.points.toString());
    setStatus(task.status);
    setAssignees(task.assignees || []);
  }, [task]);

  useEffect(() => {
    // Fetch project members when dialog opens
    if (open && task.projectId) {
      loadProjectMembers();
    }
  }, [open, task.projectId]);

  const loadProjectMembers = async () => {
    if (!task.projectId) return;
    
    try {
      setIsLoading(true);
      
      // Fetch project members
      const members = await fetchProjectMembers(task.projectId);
      
      if (members.length > 0) {
        // Fetch member profiles
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', members);
          
        if (error) throw error;
        
        setMemberProfiles(profiles.map(profile => ({
          id: profile.id,
          name: profile.name || 'Unknown User',
          avatar_url: profile.avatar_url || '',
          created_at: '',
          updated_at: ''
        })));
      }
    } catch (error) {
      console.error("Failed to fetch project members:", error);
      toast({
        title: "Error",
        description: "Failed to load project members",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine completedAt value based on status
    let completedAt = task.completedAt;
    if (status === 'done' && !completedAt) {
      completedAt = new Date().toISOString();
    } else if (status !== 'done') {
      completedAt = null;
    }
    
    const updatedTask: Task = {
      ...task,
      title,
      description,
      priority,
      points: Number(points),
      status,
      assignees,
      completedAt
    };
    
    try {
      // First update the task in Supabase
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          priority: updatedTask.priority,
          estimate: updatedTask.points,
          status: updatedTask.status,
          assignee_ids: updatedTask.assignees,
          completed_at: completedAt
        })
        .eq('id', updatedTask.id);
      
      if (error) throw error;
      
      // Then call the onTaskUpdated callback to update the UI
      onTaskUpdated(updatedTask);
      onOpenChange(false);
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = (value: string) => {
    setStatus(value as "todo" | "in-progress" | "in-review" | "done");
  };

  const toggleAssignee = (userId: string) => {
    setAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
            />
          </div>
          <div className="space-y-2">
            <Label>Assignees</Label>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : memberProfiles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {memberProfiles.map((user) => (
                  <Button
                    key={user.id}
                    type="button"
                    variant={assignees.includes(user.id) ? "default" : "outline"}
                    className="flex items-center gap-2"
                    onClick={() => toggleAssignee(user.id)}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                      <AvatarFallback>
                        <UserIcon className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    {user.name}
                    {assignees.includes(user.id) && (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No project members available</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="in-review">In Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="points">Story Points</Label>
            <Select value={points} onValueChange={setPoints}>
              <SelectTrigger>
                <SelectValue placeholder="Select points" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 8, 13].map((point) => (
                  <SelectItem key={point} value={point.toString()}>
                    {point}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
